-- Create roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'researcher', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check roles (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Policies
-- 1) Read: users can read their own roles; admins can read all
DO $$ BEGIN
  CREATE POLICY "Read own roles or any if admin"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Insert: users can assign themselves viewer/researcher; admins can assign any role to anyone
DO $$ BEGIN
  CREATE POLICY "Insert roles (self viewer/researcher or admin any)"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND role IN ('viewer','researcher'))
    OR public.has_role(auth.uid(), 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Update: only admins can update roles
DO $$ BEGIN
  CREATE POLICY "Update roles (admin only)"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Delete: admins can delete any; users can delete their own viewer/researcher roles
DO $$ BEGIN
  CREATE POLICY "Delete roles (admin any, self viewer/researcher)"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = user_id AND role IN ('viewer','researcher'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;