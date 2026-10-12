BEGIN;
CREATE TABLE public.atlas_web_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object' AND state->>'version' = '1' AND octet_length(state::text) <= 10000000),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_web_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY atlas_web_read_own ON public.atlas_web_profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE ALL ON public.atlas_web_profiles FROM anon, authenticated;
GRANT SELECT ON public.atlas_web_profiles TO authenticated;
CREATE FUNCTION public.atlas_web_save(p_state jsonb, p_revision bigint)
RETURNS SETOF public.atlas_web_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF p_revision IS NULL OR p_revision < 0 OR p_state IS NULL OR jsonb_typeof(p_state) <> 'object' OR p_state->>'version' IS DISTINCT FROM '1' OR octet_length(p_state::text) > 10000000 THEN
    RAISE EXCEPTION 'Invalid profile' USING ERRCODE = '22023';
  END IF;
  IF p_revision = 0 THEN
    RETURN QUERY INSERT INTO public.atlas_web_profiles(user_id, state) VALUES(caller, p_state) ON CONFLICT DO NOTHING RETURNING *;
  ELSE
    RETURN QUERY UPDATE public.atlas_web_profiles SET state = p_state, revision = revision + 1, updated_at = now() WHERE user_id = caller AND revision = p_revision RETURNING *;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile changed on another device' USING ERRCODE = '40001'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_web_save(jsonb,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_web_save(jsonb,bigint) TO authenticated;
COMMENT ON TABLE public.atlas_web_profiles IS 'ATLAS web profiles. Isolated from the original application progress; optimistic revision check prevents silent overwrites.';
NOTIFY pgrst, 'reload schema';
COMMIT;
