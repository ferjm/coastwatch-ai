-- First, let's see what duplicate user_ids we have and clean them up
-- Keep only one role per user (preferring admin > researcher > viewer)

-- Create a temporary function to clean up duplicates
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          WHEN 'researcher' THEN 2
          WHEN 'viewer' THEN 3
        END
    ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles 
WHERE id IN (
  SELECT id 
  FROM ranked_roles 
  WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);