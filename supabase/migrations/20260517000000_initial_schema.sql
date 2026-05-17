create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_normalized text generated always as (lower(username)) stored,
  email text,
  name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  login_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in timestamptz
);

create unique index if not exists profiles_username_normalized_key
  on public.profiles (username_normalized)
  where username_normalized is not null;

create unique index if not exists profiles_email_lower_key
  on public.profiles (lower(email))
  where email is not null;

create table if not exists public.restaurants (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 255),
  description text,
  category text,
  emoji text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_created_by_idx on public.restaurants (created_by);
create index if not exists restaurants_category_idx on public.restaurants (category);
create index if not exists restaurants_name_idx on public.restaurants (name);

create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_user_restaurant_key unique (user_id, restaurant_id)
);

create index if not exists ratings_user_id_idx on public.ratings (user_id);
create index if not exists ratings_restaurant_id_idx on public.ratings (restaurant_id);

create table if not exists public.blacklist (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blacklist_user_restaurant_key unique (user_id, restaurant_id)
);

create index if not exists blacklist_user_id_idx on public.blacklist (user_id);
create index if not exists blacklist_restaurant_id_idx on public.blacklist (restaurant_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at
before update on public.ratings
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.get_restaurant_rating_stats()
returns table (
  restaurant_id bigint,
  average numeric,
  count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ratings.restaurant_id,
    avg(ratings.score)::numeric as average,
    count(*)::bigint as count
  from public.ratings
  group by ratings.restaurant_id;
$$;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.ratings enable row level security;
alter table public.blacklist enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Profiles can be inserted by owner" on public.profiles;
create policy "Profiles can be inserted by owner"
on public.profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Profiles can be updated by owner" on public.profiles;
create policy "Profiles can be updated by owner"
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Restaurants are public readable" on public.restaurants;
create policy "Restaurants are public readable"
on public.restaurants
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create restaurants" on public.restaurants;
create policy "Authenticated users can create restaurants"
on public.restaurants
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "Admins can update restaurants" on public.restaurants;
create policy "Admins can update restaurants"
on public.restaurants
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can delete restaurants" on public.restaurants;
create policy "Admins can delete restaurants"
on public.restaurants
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Users can read own ratings" on public.ratings;
create policy "Users can read own ratings"
on public.ratings
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can create own ratings" on public.ratings;
create policy "Users can create own ratings"
on public.ratings
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own ratings" on public.ratings;
create policy "Users can update own ratings"
on public.ratings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own ratings" on public.ratings;
create policy "Users can delete own ratings"
on public.ratings
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read own blacklist" on public.blacklist;
create policy "Users can read own blacklist"
on public.blacklist
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can create own blacklist" on public.blacklist;
create policy "Users can create own blacklist"
on public.blacklist
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own blacklist" on public.blacklist;
create policy "Users can delete own blacklist"
on public.blacklist
for delete
to authenticated
using (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.restaurants to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.restaurants to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, delete on public.blacklist to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_restaurant_rating_stats() to anon, authenticated;

insert into public.restaurants (name, description, category, emoji, created_by)
select *
from (
  values
    ('麻辣烫', '热辣鲜香，自选食材', '中餐', '🌶️🍲', null::uuid),
    ('烤鱼', '香辣烤鱼，鲜嫩入味', '中餐', '🐟🔥', null::uuid),
    ('肉夹馍', '陕西传统美食，外酥里嫩', '小吃', '🥙🥩', null::uuid),
    ('杀猪粉', '贵州特色米粉，浓郁鲜香', '粉面', '🐷🍜', null::uuid),
    ('南昌拌粉', '江西特色，爽滑弹牙', '粉面', '🌶️🥢', null::uuid),
    ('跷脚牛肉', '四川乐山名吃，汤鲜肉嫩', '中餐', '🐂🍖', null::uuid),
    ('炒饭', '经典蛋炒饭，粒粒分明', '快餐', '🍳🍚', null::uuid),
    ('KFC', '炸鸡汉堡，快捷美味', '快餐', '🍗🍔', null::uuid),
    ('沙拉', '新鲜蔬果，健康轻食', '轻食', '🥗🥑', null::uuid)
) as seed(name, description, category, emoji, created_by)
where not exists (
  select 1 from public.restaurants existing where existing.name = seed.name
);
