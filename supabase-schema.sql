-- ============================================================
-- Anwesenheitsrechner – Supabase SQL Schema
-- Ausführen im Supabase SQL Editor (einmalig)
-- ============================================================

-- 1. Profiles table (ergänzt auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  is_admin  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('OFFICE','REMOTE','VACATION','FLEX','SICK')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, date)
);

-- 3. Enable Row-Level Security
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Helper function to check admin (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), FALSE);
$$;

-- 5. Profiles policies
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_select"  ON public.profiles FOR SELECT    TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_own_insert"  ON public.profiles FOR INSERT    TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_own_update"  ON public.profiles FOR UPDATE    TO authenticated USING (id = auth.uid() OR public.is_admin());

-- 6. Attendance policies
DROP POLICY IF EXISTS "attendance_own_all"   ON public.attendance;
DROP POLICY IF EXISTS "attendance_admin_sel" ON public.attendance;
CREATE POLICY "attendance_own_all"   ON public.attendance FOR ALL     TO authenticated USING (member_id = auth.uid());
CREATE POLICY "attendance_admin_sel" ON public.attendance FOR SELECT  TO authenticated USING (public.is_admin());

-- 7. Team stats function (aggregated, bypasses RLS – safe because no PII)
CREATE OR REPLACE FUNCTION public.get_team_stats(p_year INT, p_month INT)
RETURNS TABLE(type TEXT, total_days BIGINT, member_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT type, COUNT(*) AS total_days, COUNT(DISTINCT member_id) AS member_count
  FROM attendance
  WHERE EXTRACT(YEAR FROM date) = p_year AND EXTRACT(MONTH FROM date) = p_month
  GROUP BY type;
$$;

-- 8. Per-member anonymous percentages (no names, just percentages sorted desc)
-- p_holidays: Array of 'YYYY-MM-DD' strings for BW public holidays in the given month
CREATE OR REPLACE FUNCTION public.get_team_member_percentages(p_year INT, p_month INT, p_holidays TEXT[] DEFAULT '{}')
RETURNS TABLE(percentage INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_working_days INT;
BEGIN
  -- Wochentage (Mo–Fr) abzüglich übergebener Feiertage
  SELECT COUNT(*) INTO v_working_days
  FROM generate_series(
    make_date(p_year, p_month, 1),
    make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
    INTERVAL '1 day'
  ) AS d
  WHERE EXTRACT(ISODOW FROM d) < 6
    AND d::TEXT NOT IN (SELECT unnest(p_holidays));

  RETURN QUERY
  WITH per_member AS (
    SELECT
      member_id,
      COUNT(*) FILTER (WHERE a.type IN ('VACATION','FLEX','SICK')) AS absence_days,
      COUNT(*) FILTER (WHERE a.type = 'OFFICE') AS office_days
    FROM attendance a
    WHERE EXTRACT(YEAR FROM a.date) = p_year AND EXTRACT(MONTH FROM a.date) = p_month
    GROUP BY member_id
  )
  SELECT
    CASE WHEN (v_working_days - LEAST(absence_days, v_working_days)) = 0 THEN 0
         ELSE ROUND(office_days::numeric / (v_working_days - LEAST(absence_days, v_working_days)) * 100)::INT
    END AS percentage
  FROM per_member
  ORDER BY percentage DESC;
END;
$$;

-- 9. Per-member anonymous raw counts (SECURITY DEFINER für RLS-Bypass – kein PII, nur Summen)
-- Prozente werden client-seitig mit denselben Feiertagen wie das Dashboard berechnet.
CREATE OR REPLACE FUNCTION public.get_team_member_stats(p_year INT, p_month INT)
RETURNS TABLE(office_days BIGINT, absence_days BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*) FILTER (WHERE type = 'OFFICE')::BIGINT        AS office_days,
    COUNT(*) FILTER (WHERE type IN ('VACATION','FLEX','SICK'))::BIGINT AS absence_days
  FROM attendance
  WHERE EXTRACT(YEAR  FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month
  GROUP BY member_id
  ORDER BY office_days DESC;
$$;

-- 10. Grant RPC access
GRANT EXECUTE ON FUNCTION public.get_team_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_member_percentages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_member_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 10. Trigger: Profil automatisch bei User-Erstellung anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- OPTIONAL: Ersten Admin manuell setzen
-- Ersetze <USER-UUID> mit der UUID aus Authentication > Users
-- ============================================================
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<USER-UUID>';

-- ============================================================
-- MIGRATION: HOLIDAY aus DB entfernen (einmalig ausführen)
-- Feiertage werden jetzt ausschließlich per JS berechnet.
-- ============================================================
-- Schritt 1: Vorhandene HOLIDAY-Einträge löschen
-- DELETE FROM public.attendance WHERE type = 'HOLIDAY';
--
-- Schritt 2: CHECK-Constraint aktualisieren
-- ALTER TABLE public.attendance
--   DROP CONSTRAINT IF EXISTS attendance_type_check;
-- ALTER TABLE public.attendance
--   ADD CONSTRAINT attendance_type_check
--   CHECK (type IN ('OFFICE','REMOTE','VACATION','FLEX','SICK'));
