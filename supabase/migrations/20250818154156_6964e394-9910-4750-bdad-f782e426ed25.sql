-- Make roles mutually exclusive by dropping the unique constraint that allowed multiple roles
-- and creating a new constraint that ensures only one role per user

-- First, remove the old unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add a unique constraint on user_id only (one role per user)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Update the policies to reflect the new constraint
-- Drop existing policies
DROP POLICY IF EXISTS "Insert roles (self viewer/researcher or admin any)" ON public.user_roles;
DROP POLICY IF EXISTS "Delete roles (admin any, self viewer/researcher)" ON public.user_roles;

-- Create new insert policy: users can set their own role to viewer/researcher, admins can set any role
CREATE POLICY "Insert single role (self viewer/researcher or admin any)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND role IN ('viewer','researcher'))
  OR public.has_role(auth.uid(), 'admin')
);

-- Create new delete policy: only admins can delete roles (since roles are now mutually exclusive)
CREATE POLICY "Delete role (admin only)"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update the trigger function to handle the new constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign viewer role to all new users (only one role now)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  -- If it's the admin email, update to admin role instead
  IF NEW.email = 'ferjmoreno@gmail.com' THEN
    UPDATE public.user_roles 
    SET role = 'admin'
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;