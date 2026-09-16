-- Materials Sample Library — Supabase schema
-- Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  rfid_id text not null unique,
  name text not null,
  supplier text,
  cost_per_unit text,
  fire_rating text,
  acoustic_rating text,
  sustainability_cert text,
  spec_section text,
  projects_used_in text[] default '{}',
  image_url text,
  datasheet_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- active_scans — one row per sample currently on the table
-- ---------------------------------------------------------------------------
create table if not exists public.active_scans (
  rfid_id text primary key,
  scanned_at timestamptz not null default now()
);

-- Legacy single-row table (optional cleanup if you ran an earlier schema)
drop table if exists public.active_scan;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.active_scans;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.materials enable row level security;
alter table public.active_scans enable row level security;

create policy "Anon can read materials"
  on public.materials
  for select
  to anon, authenticated
  using (true);

create policy "Anon can read active_scans"
  on public.active_scans
  for select
  to anon, authenticated
  using (true);

-- Writes go through the bridge with the service role key (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Seed materials (replace rfid_id values with your physical tag UIDs)
-- ---------------------------------------------------------------------------
insert into public.materials (
  rfid_id,
  name,
  supplier,
  cost_per_unit,
  fire_rating,
  acoustic_rating,
  sustainability_cert,
  spec_section,
  projects_used_in,
  image_url,
  datasheet_url
) values
(
  '04A1B2C3',
  'Quarry Ash Porcelain',
  'Stone Source Collective',
  '$48 / sf',
  'Class A (ASTM E84)',
  'NRC 0.15',
  'Declare Red List Free',
  '09 30 00 — Tiling',
  array['Harbor Civic Center', 'Northline Offices', 'Riverwalk Lobby'],
  'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1200&q=80',
  'https://example.com/datasheets/quarry-ash-porcelain.pdf'
),
(
  '04D5E6F7',
  'White Oak Acoustic Panel',
  'Feltwood Acoustics',
  '$92 / panel',
  'Class A (ASTM E84)',
  'NRC 0.85',
  'FSC Mix Credit',
  '09 84 00 — Acoustic Room Components',
  array['Atelier Gallery', 'Summit Conference Suite'],
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
  'https://example.com/datasheets/white-oak-acoustic.pdf'
),
(
  '0489ABCD',
  'Recycled Wool Felt',
  'Textile Lab Co.',
  '$36 / yd',
  'Class B (ASTM E84)',
  'NRC 0.45',
  'Cradle to Cradle Silver',
  '09 72 00 — Wall Coverings',
  array['Kinfolk Cafe', 'West End Library'],
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80',
  'https://example.com/datasheets/recycled-wool-felt.pdf'
),
(
  '04112233',
  'Brushed Brass Mesh',
  'Metalweave Studio',
  '$68 / sf',
  'Non-combustible',
  'NRC 0.20',
  'Declare LBC Red List Approved',
  '05 70 00 — Decorative Metal',
  array['Aperture Tower Lobby', 'Southbank Hotel'],
  'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=1200&q=80',
  'https://example.com/datasheets/brushed-brass-mesh.pdf'
),
(
  '04445566',
  'Limewash Plaster',
  'Earthbound Finishes',
  '$22 / sf applied',
  'Class A (ASTM E84)',
  'NRC 0.10',
  'Declare Red List Free',
  '09 24 00 — Portland Cement Plastering',
  array['Casa Verde', 'Mill District Residences', 'Oak & Pine Inn'],
  'https://images.unsplash.com/photo-1615876234076-9f8734f9c0e0?w=1200&q=80',
  'https://example.com/datasheets/limewash-plaster.pdf'
),
(
  '04778899',
  'Terrazzo Composite Slab',
  'Aggregate Form',
  '$75 / sf',
  'Class A (ASTM E84)',
  'NRC 0.05',
  'LEED Recycled Content',
  '09 66 00 — Terrazzo Flooring',
  array['Municipal Courthouse', 'East Pier Terminal'],
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
  'https://example.com/datasheets/terrazzo-composite.pdf'
),
(
  '04AABBCC',
  'Cork Floor Tile',
  'Amorim Surface',
  '$14 / sf',
  'Class C (ASTM E84)',
  'NRC 0.55',
  'FSC 100%',
  '09 62 00 — Specialty Flooring',
  array['Studio North', 'Childrens Learning Center'],
  'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=1200&q=80',
  'https://example.com/datasheets/cork-floor-tile.pdf'
),
(
  '04DDEEFF',
  'Ribbed Clay Brick',
  'Petersen Tegl',
  '$18 / unit',
  'Non-combustible',
  'NRC 0.25',
  'EPD Available',
  '04 21 00 — Clay Unit Masonry',
  array['Brickworks Campus', 'Harbor School Annex'],
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  'https://example.com/datasheets/ribbed-clay-brick.pdf'
),
(
  '04010203',
  'Fluted Glass Partition',
  'Lumina Partition',
  '$210 / lf',
  'Class A (with rated frame)',
  'STC 35',
  'Declare Red List Free',
  '08 81 00 — Glass Glazing',
  array['Horizon HQ', 'Clinic Interiors Fit-Out'],
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  'https://example.com/datasheets/fluted-glass.pdf'
),
(
  '04040506',
  'Reclaimed Douglas Fir',
  'Salvage Timber Co.',
  '$28 / bf',
  'Class C (untreated)',
  'NRC 0.15',
  'FSC Recycled',
  '06 42 00 — Wood Paneling',
  array['Barn Renovation', 'Waterfront Lofts', 'Trailhead Lodge'],
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80',
  'https://example.com/datasheets/reclaimed-douglas-fir.pdf'
)
on conflict (rfid_id) do nothing;
