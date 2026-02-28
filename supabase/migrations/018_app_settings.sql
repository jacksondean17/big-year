-- App-wide settings (key-value store)
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Auto-update timestamp
create or replace function update_app_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_app_settings_updated_at
  before update on app_settings
  for each row
  execute function update_app_settings_timestamp();

-- RLS: anyone can read, authenticated users can write (admin page is already gated)
alter table app_settings enable row level security;

create policy "Anyone can read app_settings"
  on app_settings for select
  using (true);

create policy "Authenticated users can update app_settings"
  on app_settings for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert app_settings"
  on app_settings for insert
  with check (auth.role() = 'authenticated');

-- Seed default ranking temperature
insert into app_settings (key, value) values ('ranking_temperature', '1.5')
on conflict (key) do nothing;
