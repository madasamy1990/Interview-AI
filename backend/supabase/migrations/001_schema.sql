-- ══════════════════════════════════════
-- CRACK IT SaaS — Clean Install
-- Drop existing + Recreate all
-- ══════════════════════════════════════

-- Drop in reverse order (dependencies first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text);
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ══════════════════════════════════════
-- TABLE 1: profiles
-- ══════════════════════════════════════
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  display_name text,
  plan text default 'free',
  credits_remaining integer default 15,
  credits_used integer default 0,
  subscription_id text,
  subscription_status text default 'inactive',
  subscription_end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

-- ══════════════════════════════════════
-- TABLE 2: credit_transactions
-- ══════════════════════════════════════
CREATE TABLE public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  amount integer not null,
  balance_after integer not null default 0,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_txn_user_date ON credit_transactions(user_id, created_at DESC);

-- ══════════════════════════════════════
-- TABLE 3: payments
-- ══════════════════════════════════════
CREATE TABLE public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount integer not null,
  currency text default 'INR',
  status text default 'pending',
  payment_method text,
  plan text,
  credits_added integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);

-- ══════════════════════════════════════
-- TRIGGER: Auto create profile on signup
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, credits_remaining)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    15
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════
-- FUNCTION: Deduct credits (atomic)
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.deduct_credits(
  user_id_param uuid,
  amount integer,
  desc_text text default ''
)
RETURNS integer AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining - amount,
      credits_used = credits_used + amount,
      updated_at = now()
  WHERE id = user_id_param AND credits_remaining >= amount
  RETURNING credits_remaining INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (user_id_param, 'usage', -amount, remaining, desc_text);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════
-- FUNCTION: Add credits (on payment)
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_credits(
  user_id_param uuid,
  amount integer,
  plan_name text default 'basic'
)
RETURNS integer AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + amount,
      plan = plan_name,
      subscription_status = 'active',
      subscription_end_date = now() + interval '30 days',
      updated_at = now()
  WHERE id = user_id_param
  RETURNING credits_remaining INTO remaining;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (user_id_param, 'purchase', amount, remaining, 'Plan: ' || plan_name);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
