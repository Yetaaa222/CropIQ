create table if not exists public.user_profiles (
  id UUID primary key references auth.users (id) on delete CASCADE,
  full_name TEXT not null,
  province TEXT,
  farm_size TEXT, -- e.g., "2-5 hectares", "5-10 hectares"
  experience_years INTEGER,
  primary_crops text[], -- Array of crop names
  selected_crops text[],
  created_at TIMESTAMPTZ default NOW() not null,
  updated_at TIMESTAMPTZ default NOW() not null
);

alter table public.user_profiles ENABLE row LEVEL SECURITY;

-- Replace any existing policy with the recommended one
drop policy IF exists "Users can view own profile" on public.user_profiles;

create policy "Users can view own profile" on public.user_profiles for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = id
  );

drop policy IF exists "Users can insert own profile" on public.user_profiles;

create policy "Users can insert own profile" on public.user_profiles for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = id
  );

drop policy IF exists "Users can update own profile" on public.user_profiles;

create policy "Users can update own profile" on public.user_profiles
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = id
  );

-- ============================================
-- 2. FARMS TABLE
-- ============================================
create table if not exists public.farms (
  id UUID primary key default gen_random_uuid (),
  user_id UUID not null references auth.users (id) on delete CASCADE,
  name TEXT not null,
  latitude DOUBLE PRECISION not null,
  longitude DOUBLE PRECISION not null,
  province TEXT not null,
  soil_type TEXT, -- e.g., "Sandy loam", "Well-drained loamy soil"
  created_at TIMESTAMPTZ default NOW() not null,
  updated_at TIMESTAMPTZ default NOW() not null,
  constraint valid_latitude check (
    latitude >= -90
    and latitude <= 90
  ),
  constraint valid_longitude check (
    longitude >= -180
    and longitude <= 180
  )
);

create index IF not exists idx_farms_user_id on public.farms (user_id);

alter table public.farms ENABLE row LEVEL SECURITY;

drop policy IF exists "Users can view own farms" on public.farms;

create policy "Users can view own farms" on public.farms for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can insert own farms" on public.farms;

create policy "Users can insert own farms" on public.farms for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can update own farms" on public.farms;

create policy "Users can update own farms" on public.farms
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can delete own farms" on public.farms;

create policy "Users can delete own farms" on public.farms for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- ============================================
-- 3. SAVED CROP RECOMMENDATIONS TABLE
-- ============================================
create table if not exists public.crop_recommendations (
  id UUID primary key default gen_random_uuid (),
  user_id UUID not null references auth.users (id) on delete CASCADE,
  farm_id UUID not null references public.farms (id) on delete CASCADE,
  crop_name TEXT not null,
  crop_category TEXT, -- e.g., "Cereals", "Legumes", "Oil Seeds"
  suitability_score INTEGER not null check (
    suitability_score >= 0
    and suitability_score <= 100
  ),
  suitability_label TEXT, -- e.g., "Excellent", "Very Good"
  weather_summary TEXT, -- Short summary of weather conditions
  temperature_avg NUMERIC(5, 2),
  temperature_min NUMERIC(5, 2),
  temperature_max NUMERIC(5, 2),
  rainfall_total INTEGER, -- in mm
  humidity INTEGER, -- percentage
  recommendation_date DATE not null default CURRENT_DATE,
  created_at TIMESTAMPTZ default NOW() not null,
  constraint valid_suitability check (
    suitability_score >= 0
    and suitability_score <= 100
  )
);

create index IF not exists idx_crop_recommendations_user_id on public.crop_recommendations (user_id);

create index IF not exists idx_crop_recommendations_farm_id on public.crop_recommendations (farm_id);

create index IF not exists idx_crop_recommendations_date on public.crop_recommendations (recommendation_date);

alter table public.crop_recommendations ENABLE row LEVEL SECURITY;

drop policy IF exists "Users can view own recommendations" on public.crop_recommendations;

create policy "Users can view own recommendations" on public.crop_recommendations for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can insert own recommendations" on public.crop_recommendations;

create policy "Users can insert own recommendations" on public.crop_recommendations for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can update own recommendations" on public.crop_recommendations;

create policy "Users can update own recommendations" on public.crop_recommendations
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can delete own recommendations" on public.crop_recommendations;

create policy "Users can delete own recommendations" on public.crop_recommendations for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- ============================================
-- 4. EDUCATIONAL MODULES TABLE
-- ============================================
create table if not exists public.educational_modules (
  id INTEGER primary key,
  title TEXT not null,
  description TEXT,
  duration TEXT, -- e.g., "15 min read"
  created_at TIMESTAMPTZ default NOW() not null
);

-- Add presentation fields to educational_modules
alter table public.educational_modules
add column if not exists icon text,
add column if not exists accent_color text,
add column if not exists background_color text,
add column if not exists badge text,
add column if not exists gradient text[];

-- e.g. ['#e0f2fe', '#ffffff']
-- Backfill the default 4 modules
update public.educational_modules
set
  icon = '🌦️',
  accent_color = '#0ea5e9',
  background_color = '#e0f2fe',
  badge = 'Beginner',
  gradient = array['#e0f2fe', '#ffffff']
where
  id = 1;

update public.educational_modules
set
  icon = '🌱',
  accent_color = '#16a34a',
  background_color = '#dcfce7',
  badge = 'Core Skill',
  gradient = array['#dcfce7', '#ffffff']
where
  id = 2;

update public.educational_modules
set
  icon = '💧',
  accent_color = '#0891b2',
  background_color = '#cffafe',
  badge = 'Practical',
  gradient = array['#cffafe', '#ffffff']
where
  id = 3;

update public.educational_modules
set
  icon = '🪲',
  accent_color = '#ea580c',
  background_color = '#ffedd5',
  badge = 'Intermediate',
  gradient = array['#ffedd5', '#ffffff']
where
  id = 4;

-- Insert default modules (idempotent)
insert into
  public.educational_modules (id, title, description, duration)
values
  (
    1,
    'Understanding Weather Patterns',
    'Learn how to interpret weather data for better crop planning',
    '15 min read'
  ),
  (
    2,
    'Soil Preparation & Management',
    'Essential techniques for healthy soil and better yields',
    '20 min read'
  ),
  (
    3,
    'Water Conservation Techniques',
    'Efficient irrigation and water management strategies',
    '12 min read'
  ),
  (
    4,
    'Integrated Pest Management',
    'Sustainable approaches to pest and disease control',
    '18 min read'
  )
on conflict (id) do nothing;

alter table public.educational_modules ENABLE row LEVEL SECURITY;

drop policy IF exists "Authenticated users can view modules" on public.educational_modules;

create policy "Authenticated users can view modules" on public.educational_modules for
select
  to authenticated using (true);

-- ============================================
-- 5. LEARNING PROGRESS TABLE
-- ============================================
create table if not exists public.learning_progress (
  id UUID primary key default gen_random_uuid (),
  user_id UUID not null references auth.users (id) on delete CASCADE,
  module_id INTEGER not null references public.educational_modules (id) on delete CASCADE,
  completed BOOLEAN default false not null,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER default 0 check (
    progress_percentage >= 0
    and progress_percentage <= 100
  ),
  created_at TIMESTAMPTZ default NOW() not null,
  updated_at TIMESTAMPTZ default NOW() not null,
  unique (user_id, module_id)
);

create index IF not exists idx_learning_progress_user_id on public.learning_progress (user_id);

create index IF not exists idx_learning_progress_module_id on public.learning_progress (module_id);

alter table public.learning_progress ENABLE row LEVEL SECURITY;

drop policy IF exists "Users can view own progress" on public.learning_progress;

create policy "Users can view own progress" on public.learning_progress for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can insert own progress" on public.learning_progress;

create policy "Users can insert own progress" on public.learning_progress for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can update own progress" on public.learning_progress;

create policy "Users can update own progress" on public.learning_progress
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

drop policy IF exists "Users can delete own progress" on public.learning_progress;

create policy "Users can delete own progress" on public.learning_progress for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================
create or replace function public.handle_updated_at () RETURNS TRIGGER as $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger IF exists set_updated_at_user_profiles on public.user_profiles;

create trigger set_updated_at_user_profiles BEFORE
update on public.user_profiles for EACH row
execute FUNCTION public.handle_updated_at ();

drop trigger IF exists set_updated_at_farms on public.farms;

create trigger set_updated_at_farms BEFORE
update on public.farms for EACH row
execute FUNCTION public.handle_updated_at ();

drop trigger IF exists set_updated_at_learning_progress on public.learning_progress;

create trigger set_updated_at_learning_progress BEFORE
update on public.learning_progress for EACH row
execute FUNCTION public.handle_updated_at ();

-- Function to automatically create user profile on signup (idempotent)
create or replace function public.handle_new_user () RETURNS TRIGGER as $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  SELECT NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute from public roles to be safe
revoke
execute on FUNCTION public.handle_new_user ()
from
  anon,
  authenticated;

-- Trigger to create profile when user signs up
-- Remove existing trigger if present, then recreate
drop trigger IF exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after INSERT on auth.users for EACH row
execute FUNCTION public.handle_new_user ();

-- ============================================
-- 7. HELPER VIEWS (Optional)
-- ============================================
create or replace view public.user_dashboard as
select
  up.id as user_id,
  up.full_name,
  up.province,
  COUNT(distinct f.id) as total_farms,
  COUNT(distinct cr.id) as total_recommendations,
  COUNT(distinct lp.module_id) filter (
    where
      lp.completed = true
  ) as completed_modules
from
  public.user_profiles up
  left join public.farms f on f.user_id = up.id
  left join public.crop_recommendations cr on cr.user_id = up.id
  left join public.learning_progress lp on lp.user_id = up.id
group by
  up.id,
  up.full_name,
  up.province;

-- Keep view with invoker security so RLS applies per calling role
alter view public.user_dashboard
set
  (security_invoker = true);

-- ============================================
-- MIGRATION: Add selected_crops column if missing
-- ============================================
-- This ensures the column exists even if the table was created before this column was added
do $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'selected_crops'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN selected_crops TEXT[];
        
        RAISE NOTICE 'Column selected_crops added successfully';
    ELSE
        RAISE NOTICE 'Column selected_crops already exists';
    END IF;
END $$;

-- ============================================
-- End of migration
-- CROPS TABLE
create table if not exists public.crops (
  id INTEGER primary key,
  name TEXT not null unique,
  full_name TEXT not null,
  category TEXT not null,
  description TEXT,
  short_description TEXT,
  image_emoji TEXT, -- emoji or image reference
  suitability_baseline INTEGER default 70 check (
    suitability_baseline >= 0
    and suitability_baseline <= 100
  ),
  suitability_label TEXT default 'Good',
  temp_range_min NUMERIC(5, 2),
  temp_range_max NUMERIC(5, 2),
  rainfall_min INTEGER,
  rainfall_max INTEGER,
  humidity_min INTEGER,
  humidity_max INTEGER,
  soil_type TEXT,
  growing_season_min INTEGER, -- days
  growing_season_max INTEGER, -- days
  growing_months TEXT,
  water_needs TEXT,
  planting_depth_min NUMERIC(5, 2),
  planting_depth_max NUMERIC(5, 2),
  planting_depth_unit TEXT default 'cm',
  spacing_rows TEXT,
  spacing_plants TEXT,
  companion_plants TEXT,
  common_diseases text[], -- array of diseases
  management_practices TEXT,
  created_at TIMESTAMPTZ default NOW() not null
);

create index IF not exists idx_crops_name on public.crops (name);

create index IF not exists idx_crops_category on public.crops (category);

alter table public.crops ENABLE row LEVEL SECURITY;

drop policy IF exists "Anyone can view crops" on public.crops;

create policy "Anyone can view crops" on public.crops for
select
  using (true);


-- 1) Add columns if they don't exist
do $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crops' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE public.crops
    ADD COLUMN image_path TEXT;
    RAISE NOTICE 'Column public.crops.image_path added';
  ELSE
    RAISE NOTICE 'Column public.crops.image_path already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crops' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.crops
    ADD COLUMN image_url TEXT;
    RAISE NOTICE 'Column public.crops.image_url added';
  ELSE
    RAISE NOTICE 'Column public.crops.image_url already exists';
  END IF;
END
$$;

-- 2) Backfill image_path by convention, only for rows without an image_path
--    Assumes you upload files to bucket 'crop-images' with filenames like '1.jpg' or 'maize.jpg'.
--    This example uses the crop id (numeric) and assumes .jpg extension. Adjust extension if needed.
update public.crops
set
  image_path = concat(id::text, '.jpg')
where
  image_path is null
  and exists (
    -- quick heuristic: only set where a reasonable id exists and no custom image_path present
    select
      1
    from
      public.crops c2
    where
      c2.id = public.crops.id
  );

do $$
DECLARE
  supabase_url TEXT := current_setting('app.supabase_url', true); -- attempt to get if set
  bucket_name TEXT := 'crop-images';
BEGIN
 
  IF supabase_url IS NULL THEN
    supabase_url := '<YOUR_SUPABASE_URL>';
  END IF;

  UPDATE public.crops
  SET image_url = supabase_url || '/storage/v1/object/public/' || bucket_name || '/' || image_path
  WHERE image_url IS NULL
    AND image_path IS NOT NULL;
END
$$;

update public.crops
set
  image_url = 'https://i.pinimg.com/1200x/7d/47/9e/7d479e6ce43606ce7605c4c3e5a3f7e3.jpg'
where
  id = 1;

update public.crops
set
  growing_months = 'November-March'
where
  name = 'Maize';

update public.crops
set
  growing_months = 'November-February'
where
  name = 'Groundnuts';

update public.crops
set
  growing_months = 'November-March'
where
  name = 'Soybeans';

update public.crops
set
  growing_months = 'October-February'
where
  name = 'Sunflower';

update public.crops
set
  growing_months = 'November-April'
where
  name = 'Cassava';

update public.crops
set
  growing_months = 'November-March'
where
  name = 'Millet';

update public.crops
set
  growing_months = 'November-April'
where
  name = 'Sorghum';

update public.crops
set
  growing_months = 'December-April'
where
  name = 'Rice';

update public.crops
set
  growing_months = 'November-February'
where
  name = 'Beans';

update public.crops
set
  growing_months = 'November-March'
where
  name = 'Sweet Potato';

update public.crops
set
  growing_months = 'December-April'
where
  name = 'Tomatoes';

update public.crops
set
  growing_months = 'May-August'
where
  name = 'Cabbage';

update public.crops
set
  growing_months = 'November-March'
where
  name = 'Pumpkin';

update public.crops
set
  growing_months = 'May-August'
where
  name = 'Onions';

-- 4b. Store paragraphs separately (ordered)
create table if not exists public.educational_module_paragraphs (
  id bigserial primary key,
  module_id integer not null references public.educational_modules (id) on delete cascade,
  order_index integer not null,
  type text not null default 'text', -- 'text' or 'image'
  paragraph text, -- The text content or image caption
  image_url text -- URL if type is 'image'
);

create index if not exists idx_emp_module_id on public.educational_module_paragraphs (module_id, order_index);

alter table public.educational_module_paragraphs enable row level security;

drop policy if exists "Modules visible to all authenticated" on public.educational_module_paragraphs;

create policy "Modules visible to all authenticated" on public.educational_module_paragraphs for
select
  to authenticated using (true);