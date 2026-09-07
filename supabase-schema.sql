-- Anwesenheitsrechner - vollständiges, wiederholt ausführbares Supabase-Schema
-- Im Supabase SQL Editor als Datenbank-Owner ausführen.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(encode(gen_random_bytes(8), 'hex'), 1, 12),
  presence_target NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (presence_target > 0 AND presence_target <= 1),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bestehende Installationen können eine ältere Teamtabelle besitzen.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS presence_target NUMERIC(4,3) NOT NULL DEFAULT 0.5;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE public.teams SET invite_code = substr(encode(gen_random_bytes(8), 'hex'), 1, 12) WHERE invite_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_code_idx ON public.teams(invite_code);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exclude_from_team BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.teams t SET owner_id = p.id
FROM public.profiles p
WHERE t.owner_id IS NULL AND p.team_id = t.id AND p.role = 'ersteller';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IS NULL OR role IN ('ersteller','mitglied'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_work_days_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_work_days_check CHECK (
  cardinality(work_days) BETWEEN 1 AND 5 AND work_days <@ ARRAY[1,2,3,4,5]
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, date)
);
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_type_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_type_check CHECK (type IN ('OFFICE','REMOTE','VACATION','FLEX','SICK'));
CREATE INDEX IF NOT EXISTS attendance_member_date_idx ON public.attendance(member_id, date);
CREATE INDEX IF NOT EXISTS profiles_team_idx ON public.profiles(team_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own_select ON public.profiles;
DROP POLICY IF EXISTS profiles_own_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Nur diese persönlichen Felder dürfen über die REST-API geändert werden.
-- is_admin, team_id und role bleiben ausschließlich SECURITY-DEFINER-RPCs vorbehalten.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, work_days, exclude_from_team) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS teams_member_select ON public.teams;
DROP POLICY IF EXISTS teams_owner_update ON public.teams;
CREATE POLICY teams_member_select ON public.teams FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.team_id = teams.id)
);
CREATE POLICY teams_owner_update ON public.teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
REVOKE UPDATE ON public.teams FROM authenticated;
GRANT UPDATE (name, presence_target) ON public.teams TO authenticated;

DROP POLICY IF EXISTS attendance_own_all ON public.attendance;
DROP POLICY IF EXISTS attendance_admin_sel ON public.attendance;
CREATE POLICY attendance_own_all ON public.attendance FOR ALL TO authenticated
  USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());

DROP FUNCTION IF EXISTS public.create_team(TEXT, NUMERIC);
CREATE FUNCTION public.create_team(p_name TEXT, p_target NUMERIC DEFAULT 0.5)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_team_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF char_length(trim(p_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'invalid team name'; END IF;
  IF p_target <= 0 OR p_target > 1 THEN RAISE EXCEPTION 'invalid presence target'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id IS NOT NULL) THEN
    RAISE EXCEPTION 'user already belongs to a team';
  END IF;
  INSERT INTO teams(name, presence_target, owner_id)
    VALUES (trim(p_name), p_target, auth.uid()) RETURNING id INTO v_team_id;
  UPDATE profiles SET team_id = v_team_id, role = 'ersteller' WHERE id = auth.uid();
  RETURN v_team_id;
END;
$$;

DROP FUNCTION IF EXISTS public.join_team_by_code(TEXT);
CREATE FUNCTION public.join_team_by_code(p_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_team_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id IS NOT NULL) THEN RETURN FALSE; END IF;
  SELECT id INTO v_team_id FROM teams WHERE lower(invite_code) = lower(trim(p_code));
  IF v_team_id IS NULL THEN RETURN FALSE; END IF;
  UPDATE profiles SET team_id = v_team_id, role = 'mitglied' WHERE id = auth.uid();
  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.get_team_members();
CREATE FUNCTION public.get_team_members()
RETURNS TABLE(name TEXT, role TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.name, p.role
  FROM profiles caller JOIN profiles p ON p.team_id = caller.team_id
  WHERE caller.id = auth.uid() AND caller.role = 'ersteller' AND caller.team_id IS NOT NULL
  ORDER BY (p.role = 'ersteller') DESC, p.name;
$$;

-- Das Team wird stets aus auth.uid() ermittelt. Übergebene Feiertage werden
-- aus vorhandenen (z. B. alten oder direkt geschriebenen) Rohdaten entfernt.
DROP FUNCTION IF EXISTS public.get_team_stats(INT, INT);
CREATE FUNCTION public.get_team_stats(p_year INT, p_month INT, p_holidays DATE[] DEFAULT '{}')
RETURNS TABLE(type TEXT, total_days BIGINT, member_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.type, count(*), count(DISTINCT a.member_id)
  FROM profiles caller
  JOIN profiles p ON p.team_id = caller.team_id AND NOT p.exclude_from_team
  JOIN attendance a ON a.member_id = p.id
  WHERE caller.id = auth.uid() AND caller.team_id IS NOT NULL
    AND extract(year FROM a.date) = p_year AND extract(month FROM a.date) = p_month
    AND extract(isodow FROM a.date)::INT = ANY(p.work_days)
    AND NOT (a.date = ANY(coalesce(p_holidays, '{}'::date[])))
  GROUP BY a.type;
$$;

DROP FUNCTION IF EXISTS public.get_team_member_percentages(INT, INT, TEXT[]);
DROP FUNCTION IF EXISTS public.get_team_member_stats(INT, INT, DATE);
CREATE FUNCTION public.get_team_member_stats(
  p_year INT, p_month INT, p_today DATE DEFAULT NULL, p_holidays DATE[] DEFAULT '{}'
)
RETURNS TABLE(office_days BIGINT, absence_days BIGINT, work_days INT[], office_days_mtd BIGINT, absence_days_mtd BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    count(*) FILTER (WHERE a.type = 'OFFICE'),
    count(*) FILTER (WHERE a.type IN ('VACATION','FLEX','SICK')),
    p.work_days,
    count(*) FILTER (WHERE a.type = 'OFFICE' AND (p_today IS NULL OR a.date <= p_today)),
    count(*) FILTER (WHERE a.type IN ('VACATION','FLEX','SICK') AND (p_today IS NULL OR a.date <= p_today))
  FROM profiles caller
  JOIN profiles p ON p.team_id = caller.team_id AND NOT p.exclude_from_team
  LEFT JOIN attendance a ON a.member_id = p.id
    AND extract(year FROM a.date) = p_year AND extract(month FROM a.date) = p_month
    AND extract(isodow FROM a.date)::INT = ANY(p.work_days)
    AND NOT (a.date = ANY(coalesce(p_holidays, '{}'::date[])))
  WHERE caller.id = auth.uid() AND caller.team_id IS NOT NULL
  GROUP BY p.id, p.work_days
  ORDER BY count(*) FILTER (WHERE a.type = 'OFFICE') DESC;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO profiles(id, name) VALUES (
    NEW.id, left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)), 60)
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SECURITY-DEFINER-Funktionen nicht implizit an PUBLIC/anon freigeben.
REVOKE ALL ON FUNCTION public.create_team(TEXT, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_team_by_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_members() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_stats(INT, INT, DATE[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_member_stats(INT, INT, DATE, DATE[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_stats(INT, INT, DATE[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_member_stats(INT, INT, DATE, DATE[]) TO authenticated;

DELETE FROM public.attendance WHERE type = 'HOLIDAY';

-- Optional: ersten Administrator ausschließlich als Datenbank-Owner setzen:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<USER-UUID>';
