
-- crop 
CREATE TABLE IF NOT EXISTS public.crops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    image_emoji TEXT, -- emoji or image reference
    suitability_baseline INTEGER DEFAULT 70 CHECK (suitability_baseline >= 0 AND suitability_baseline <= 100),
    suitability_label TEXT DEFAULT 'Good',
    temp_range_min NUMERIC(5,2),
    temp_range_max NUMERIC(5,2),
    rainfall_min INTEGER, -- mm
    rainfall_max INTEGER, -- mm
    humidity_min INTEGER,
    humidity_max INTEGER,
    soil_type TEXT,
    growing_season_min INTEGER, -- days
    growing_season_max INTEGER, -- days
    growing_months TEXT,
    water_needs TEXT,
    planting_depth_min NUMERIC(5,2),
    planting_depth_max NUMERIC(5,2),
    planting_depth_unit TEXT DEFAULT 'cm',
    spacing_rows TEXT,
    spacing_plants TEXT,
    companion_plants TEXT,
    common_diseases TEXT[], -- array of diseases
    management_practices TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crops_name ON public.crops(name);
CREATE INDEX IF NOT EXISTS idx_crops_category ON public.crops(category);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view crops" ON public.crops;
CREATE POLICY "Anyone can view crops"
  ON public.crops
  FOR SELECT
  USING (true);

-- ============================================
-- INSERT DEFAULT CROPS DATA
-- ============================================
INSERT INTO public.crops (
    id, name, full_name, category, description, short_description, image_emoji,
    suitability_baseline, suitability_label,
    temp_range_min, temp_range_max,
    rainfall_min, rainfall_max,
    humidity_min, humidity_max,
    soil_type,
    growing_season_min, growing_season_max, growing_months,
    water_needs,
    planting_depth_min, planting_depth_max,
    spacing_rows, spacing_plants,
    companion_plants,
    common_diseases,
    management_practices
) VALUES
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
        18, 27,
        600, 1000,
        60, 70,
        'Well-drained loamy soil',
        120, 150,
        'November-March',
        'Moderate to high',
        5, 7.5,
        '75cm between rows',
        '25cm between plants',
        'Beans, squash, cucumbers',
        ARRAY['Maize Streak Virus', 'Gray Leaf Spot', 'Armyworm'],
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
        20, 30,
        500, 1000,
        65, 75,
        'Sandy loam, well-drained',
        90, 130,
        'November-February',
        'Moderate',
        5, 8,
        '45cm between rows',
        '15cm between plants',
        'Maize, sweet potato, pumpkin',
        ARRAY['Rosette Disease', 'Leaf Spot', 'Aflatoxin'],
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
        20, 30,
        450, 700,
        60, 80,
        'Well-drained loamy soil, pH 6.0-6.8',
        90, 150,
        'November-March',
        'Moderate',
        3, 5,
        '60cm between rows',
        '10cm between plants',
        'Maize, sorghum, sunflower',
        ARRAY['Rust', 'Bacterial Blight', 'Pod Borer'],
        'Inoculate seeds, practice crop rotation'
    ),
    (
        4,
        'Sunflower',
        'Sunflower',
        'Oil Seeds',
        'Oil seed crop, drought tolerant',
        'Drought-resistant oil crop. Perfect for drier conditions and regions.',
        '🌻',
        82,
        'Very Good',
        20, 28,
        400, 650,
        40, 60,
        'Well-drained soil, tolerates various soil types',
        90, 120,
        'October-February',
        'Low to moderate',
        3, 5,
        '70cm between rows',
        '30cm between plants',
        'Maize, beans, cucumber',
        ARRAY['Downy Mildew', 'Rust', 'Head Rot'],
        'Plant after last frost, requires full sun exposure'
    )
ON CONFLICT (id) DO NOTHING;
