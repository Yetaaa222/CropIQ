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

-- ============================================
-- INSERT DEFAULT CROPS DATA
-- ============================================
INSERT INTO public.crops (
  id,
  name,
  full_name,
  category,
  description,
  short_description,
  image_emoji,
  suitability_baseline,
  suitability_label,
  temp_range_min,
  temp_range_max,
  rainfall_min,
  rainfall_max,
  humidity_min,
  humidity_max,
  soil_type,
  growing_season_min,
  growing_season_max,
  growing_months,
  water_needs,
  planting_depth_min,
  planting_depth_max,
  spacing_rows,
  spacing_plants,
  companion_plants,
  common_diseases,
  management_practices
)
VALUES
  (
    1,
    'Maize',
    'Maize',
    'Cereals',
    'Staple crop, well-suited to Zambian climate',
    'Excellent choice for your region. Current rainfall and temperature are ideal.',
    '🌾',
    95,
    'Excellent',
    18,
    27,
    600,
    1000,
    60,
    70,
    'Well-drained loamy soil',
    120,
    150,
    'November-March',
    'Moderate to high',
    5,
    7.5,
    '75cm between rows',
    '25cm between plants',
    'Beans, squash, cucumbers',
    ARRAY['Maize Streak Virus','Gray Leaf Spot','Armyworm'],
    'Plant at the beginning of rainy season, ensure proper spacing'
  ),
  (
    2,
    'Groundnuts',
    'Groundnuts (Peanuts)',
    'Legumes',
    'Nitrogen-fixing legume, good cash crop',
    'Great nitrogen-fixing crop. Well-suited to current climate conditions.',
    '🥜',
    88,
    'Excellent',
    20,
    30,
    500,
    1000,
    65,
    75,
    'Sandy loam, well-drained',
    90,
    130,
    'November-February',
    'Moderate',
    5,
    8,
    '45cm between rows',
    '15cm between plants',
    'Maize, sweet potato, pumpkin',
    ARRAY['Rosette Disease','Leaf Spot','Aflatoxin'],
    'Rotate with cereals, harvest when leaves turn yellow'
  ),
  (
    3,
    'Soybeans',
    'Soybeans',
    'Legumes',
    'High protein content, improves soil fertility',
    'High protein crop. Improves soil health and fertility naturally.',
    '🌱',
    85,
    'Very Good',
    20,
    30,
    450,
    700,
    60,
    80,
    'Well-drained loamy soil, pH 6.0-6.8',
    90,
    150,
    'November-March',
    'Moderate',
    3,
    5,
    '60cm between rows',
    '10cm between plants',
    'Maize, sorghum, sunflower',
    ARRAY['Rust','Bacterial Blight','Pod Borer'],
    'Inoculate seeds, practice crop rotation'
  ),
  
  (
    5,
    'Cassava',
    'Cassava',
    'Root Crop',
    'Drought-tolerant staple root crop',
    'Excellent for dry regions. Performs well even with low rainfall.',
    '🥔',
    90,
    'Excellent',
    18,
    32,
    400,
    900,
    50,
    70,
    'Sandy loam, well-drained',
    240,
    360,
    'November-April',
    'Low',
    2,      -- planting_depth_min (m or cm depending on your convention; numeric kept small)
    5,      -- planting_depth_max
    '100cm between rows',   -- spacing_rows (was previously unquoted/misaligned)
    '30cm between plants',   -- spacing_plants
    'Maize, beans',
    ARRAY['Cassava Mosaic Virus','Bacterial Blight','Root Rot'],
    'Plant at the start of rainy season; space properly to avoid overcrowding'
  ),
  (
    6,
    'Millet',
    'Finger Millet',
    'Cereal',
    'Drought-tolerant cereal for human and animal consumption',
    'Good for semi-arid areas. Tolerates high temperatures.',
    '🌾',
    85,
    'Very Good',
    20,
    35,
    300,
    700,
    40,
    60,
    'Sandy, well-drained soil',
    90,
    120,
    'November-March',
    'Low',
    3,
    5,
    '45cm between rows',
    '10cm between plants',
    'Legumes',
    ARRAY['Blast Disease','Leaf Spot'],
    'Plant early in rainy season; ensure good spacing'
  ),
  (
    7,
    'Sorghum',
    'Sorghum',
    'Cereal',
    'Versatile cereal, drought-resistant and nutritious',
    'Ideal for hot regions. Can tolerate low rainfall.',
    '🌾',
    88,
    'Excellent',
    22,
    35,
    400,
    800,
    40,
    60,
    'Loamy, well-drained',
    90,
    150,
    'November-April',
    'Low to moderate',
    4,
    6,
    '50cm between rows',
    '15cm between plants',
    'Legumes, groundnuts',
    ARRAY['Sorghum Mosaic Virus','Anthracnose','Grain Mold'],
    'Plant at onset of rains; rotate with legumes'
  ),
  (
    8,
    'Rice',
    'Rice',
    'Cereal',
    'Staple grain requiring waterlogged conditions or irrigation',
    'Suitable for irrigated lowlands; high yields with proper water management.',
    '🍚',
    80,
    'Good',
    22,
    32,
    1200,
    2000,
    70,
    90,
    'Clay loam, water-retentive',
    90,
    150,
    'December-April',
    'High',
    1,
    2,
    '25cm between rows',
    '15cm between plants',
    'Legumes, vegetables',
    ARRAY['Rice Blast','Bacterial Leaf Blight','Brown Spot'],
    'Requires flooded paddies or irrigation; plant in rows'
  ),
  (
    9,
    'Beans',
    'Common Beans',
    'Legumes',
    'Protein-rich legume, improves soil nitrogen',
    'Excellent rotation crop with cereals. Performs well in moderate rainfall.',
    '🌱',
    92,
    'Excellent',
    18,
    28,
    500,
    1000,
    60,
    80,
    'Loamy soil, well-drained',
    60,
    100,
    'November-February',
    'Moderate',
    3,
    5,
    '40cm between rows',
    '10cm between plants',
    'Maize, millet, sorghum',
    ARRAY['Bean Rust','Angular Leaf Spot','Aphids'],
    'Plant after rains start; rotate with cereals'
  ),
  (
    10,
    'Sweet Potato',
    'Sweet Potato',
    'Root Crop',
    'High-yield root crop rich in vitamins',
    'Great for diverse soils and moderate rainfall areas.',
    '🍠',
    85,
    'Very Good',
    20,
    30,
    500,
    1000,
    50,
    70,
    'Sandy loam, well-drained',
    90,
    120,
    'November-March',
    'Moderate',
    5,
    10,
    '90cm between rows',
    '30cm between plants',
    'Maize, beans',
    ARRAY['Sweet Potato Virus','Root Rot','Weevils'],
    'Plant at start of rains; provide trellis if climbing varieties'
  ),
  (
    11,
    'Tomatoes',
    'Tomato',
    'Vegetable',
    'Popular vegetable for fresh markets and processing',
    'High market demand; requires moderate rainfall and warm temperatures.',
    '🍅',
    88,
    'Excellent',
    20,
    30,
    600,
    1200,
    60,
    80,
    'Loamy, fertile soil',
    90,
    120,
    'December-April',
    'Moderate',
    5,
    10,
    '50cm between rows',
    '30cm between plants',
    'Basil, onions, carrots',
    ARRAY['Late Blight','Fusarium Wilt','Aphids'],
    'Plant seedlings after last frost; use staking and irrigation'
  ),
  (
    12,
    'Cabbage',
    'Cabbage',
    'Vegetable',
    'Leafy vegetable, cool-season crop',
    'Best for moderate temperatures; sensitive to heat.',
    '🥬',
    80,
    'Good',
    15,
    25,
    500,
    1000,
    60,
    80,
    'Loamy, fertile soil',
    90,
    120,
    'May-August',
    'Moderate',
    3,
    5,
    '50cm between rows',
    '30cm between plants',
    'Carrots, onions, beets',
    ARRAY['Cabbage Worm','Downy Mildew','Black Rot'],
    'Plant in rows; protect from pests'
  ),
  (
    13,
    'Pumpkin',
    'Pumpkin',
    'Vegetable',
    'Vine vegetable, used for food and livestock feed',
    'Prefers warm temperatures and moderate rainfall.',
    '🎃',
    85,
    'Very Good',
    20,
    32,
    500,
    1000,
    50,
    70,
    'Loamy, fertile soil',
    90,
    120,
    'November-March',
    'Moderate',
    5,
    10,
    '100cm between rows',
    '50cm between plants',
    'Maize, beans, cucumbers',
    ARRAY['Powdery Mildew','Downy Mildew','Squash Bugs'],
    'Plant after last frost; provide trellis if necessary'
  ),
  (
    14,
    'Onions',
    'Onion',
    'Vegetable',
    'Bulb vegetable, used widely in cooking',
    'Suitable for warm climates; moderate rainfall required.',
    '🧅',
    82,
    'Very Good',
    18,
    28,
    500,
    900,
    60,
    80,
    'Sandy loam, well-drained',
    90,
    120,
    'May-August',
    'Moderate',
    1,
    2,
    '20cm between rows',
    '10cm between plants',
    'Carrots, lettuce, tomatoes',
    ARRAY['Onion Fly','Downy Mildew','Purple Blotch'],
    'Plant in rows; ensure good drainage'
  ),
  (
    15,
    'Peas',
    'Garden Peas',
    'Legumes',
    'Cool-season legume, high protein content',
    'Plant during cooler months; improves soil nitrogen.',
    '🌱',
    78,
    'Good',
    15,
    25,
    500,
    900,
    60,
    80,
    'Loamy, fertile soil',
    60,
    90,
    '2-3 months',
    'Moderate',
    2,
    4,
    '30cm between rows',
    '10cm between plants',
    'Carrots, radishes, lettuce',
    ARRAY['Powdery Mildew','Aphids','Root Rot'],
    'Plant in rows; support climbing varieties'
  ),
  (
    16,
    'Sugarcane',
    'Sugarcane',
    'Cash Crop',
    'Tall, perennial crop used for sugar production and bioenergy',
    'Thrives in warm, wet conditions; high water requirement but very profitable.',
    '🍬',
    85,
    'Very Good',
    25,
    35,
    1500,
    2500,
    80,
    95,
    'Loamy, fertile, well-drained soil with irrigation',
    1200,
    1800,
    'November-April',
    'High',
    10,
    15,
    '100cm between rows',
    '30cm between plants',
    'Legumes, maize, beans',
    ARRAY['Ratoon Stunting Disease','Red Rot','Sugarcane Mosaic Virus'],
    'Requires ample water; plant at the start of rainy season; ensure proper spacing and pest management'
)

ON CONFLICT (id) DO NOTHING;

-- 1) Add columns if they don't exist
DO $$
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
UPDATE public.crops
SET image_path = concat(id::text, '.jpg')
WHERE image_path IS NULL
  AND EXISTS (
    -- quick heuristic: only set where a reasonable id exists and no custom image_path present
    SELECT 1 FROM public.crops c2 WHERE c2.id = public.crops.id
  );


DO $$
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

UPDATE public.crops
SET image_url = 'https://i.pinimg.com/1200x/6d/a9/14/6da91415b6b22b78338ca277bdb90361.jpg'
WHERE id = 1;


UPDATE public.crops SET growing_months = 'November-March' WHERE name = 'Maize';
UPDATE public.crops SET growing_months = 'November-February' WHERE name = 'Groundnuts';
UPDATE public.crops SET growing_months = 'November-March' WHERE name = 'Soybeans';
UPDATE public.crops SET growing_months = 'October-February' WHERE name = 'Sunflower';
UPDATE public.crops SET growing_months = 'November-April' WHERE name = 'Cassava';
UPDATE public.crops SET growing_months = 'November-March' WHERE name = 'Millet';
UPDATE public.crops SET growing_months = 'November-April' WHERE name = 'Sorghum';
UPDATE public.crops SET growing_months = 'December-April' WHERE name = 'Rice';
UPDATE public.crops SET growing_months = 'November-February' WHERE name = 'Beans';
UPDATE public.crops SET growing_months = 'November-March' WHERE name = 'Sweet Potato';
UPDATE public.crops SET growing_months = 'December-April' WHERE name = 'Tomatoes';
UPDATE public.crops SET growing_months = 'May-August' WHERE name = 'Cabbage';
UPDATE public.crops SET growing_months = 'November-March' WHERE name = 'Pumpkin';
UPDATE public.crops SET growing_months = 'May-August' WHERE name = 'Onions';