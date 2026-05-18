-- Recreate full schema for new Lovable Cloud backend

-- Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'researcher', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Read own roles or any if admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert single role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid() AND role IN ('viewer','researcher')) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update single role (admin only)" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete role (admin only)" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New user trigger: profile + role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email = 'ferjmoreno@gmail.com' THEN
    UPDATE public.user_roles SET role = 'admin' WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- images
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  captured_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploaded','queued','processing','processed','failed')),
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_gps ON public.images(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;
CREATE INDEX idx_detections_image_id ON public.detections(image_id);
CREATE INDEX idx_detections_label ON public.detections(label);
CREATE INDEX idx_detections_confidence ON public.detections(confidence);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View images (any role)" ON public.images FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher') OR has_role(auth.uid(),'viewer'));
CREATE POLICY "Insert images (admin/researcher)" ON public.images FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher'));
CREATE POLICY "Update images (admin/researcher)" ON public.images FOR UPDATE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher'));
CREATE POLICY "Delete images (admin/researcher)" ON public.images FOR DELETE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher'));

CREATE POLICY "View detections" ON public.detections FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher') OR has_role(auth.uid(),'viewer'));
CREATE POLICY "Insert detections" ON public.detections FOR INSERT WITH CHECK (true);
CREATE POLICY "Delete detections (admin/researcher)" ON public.detections FOR DELETE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher'));

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON public.images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('images','images',false), ('thumbnails','thumbnails',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher')));
CREATE POLICY "View images bucket" ON storage.objects FOR SELECT
  USING (bucket_id = 'images' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher') OR has_role(auth.uid(),'viewer')));
CREATE POLICY "Delete images bucket" ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher')));

CREATE POLICY "Upload thumbnails" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher')));
CREATE POLICY "View thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Delete thumbnails" ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'researcher')));
