
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- ============ INSTITUTIONS ============
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'UGX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, institution_id, role)
);

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_institution_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(_inst UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND institution_id = _inst AND role = 'admin')
$$;

-- ============ JOIN REQUESTS ============
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ============ DRUGS ============
CREATE TABLE public.drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  category TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  supplier TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  prescription_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, phone)
);

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES public.drugs(id),
  drug_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  total_price NUMERIC NOT NULL,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  employee_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  transaction_id TEXT NOT NULL UNIQUE,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_inst_date ON public.sales(institution_id, sold_at DESC);
CREATE INDEX idx_drugs_inst ON public.drugs(institution_id);
CREATE INDEX idx_customers_inst ON public.customers(institution_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT ON public.institutions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.join_requests TO anon, authenticated;
GRANT ALL ON public.join_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drugs TO authenticated;
GRANT ALL ON public.drugs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

GRANT SELECT, INSERT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- ============ RLS ============
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Institutions: anyone can read (for shop search during register); only admins can update their own
CREATE POLICY "anyone reads institutions" ON public.institutions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth creates institutions" ON public.institutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins update their institution" ON public.institutions FOR UPDATE TO authenticated USING (public.is_admin_of(id));

-- Profiles: users read profiles in their institution; users update their own
CREATE POLICY "read profiles in own inst" ON public.profiles FOR SELECT TO authenticated
  USING (institution_id = public.current_institution_id() OR id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin_of(institution_id));

-- User roles
CREATE POLICY "read roles in own inst" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_of(institution_id));
CREATE POLICY "insert own role on signup" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_of(institution_id));

-- Join requests
CREATE POLICY "anyone creates join request" ON public.join_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read join requests" ON public.join_requests FOR SELECT TO authenticated
  USING (public.is_admin_of(institution_id));
CREATE POLICY "admins update join requests" ON public.join_requests FOR UPDATE TO authenticated
  USING (public.is_admin_of(institution_id));

-- Inst-scoped tables (drugs, customers, sales, notifications, audit_logs)
CREATE POLICY "inst members read drugs" ON public.drugs FOR SELECT TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "inst members insert drugs" ON public.drugs FOR INSERT TO authenticated WITH CHECK (institution_id = public.current_institution_id());
CREATE POLICY "inst members update drugs" ON public.drugs FOR UPDATE TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "admins delete drugs" ON public.drugs FOR DELETE TO authenticated USING (public.is_admin_of(institution_id));

CREATE POLICY "inst members read customers" ON public.customers FOR SELECT TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "inst members write customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (institution_id = public.current_institution_id());
CREATE POLICY "inst members update customers" ON public.customers FOR UPDATE TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "admins delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_admin_of(institution_id));

CREATE POLICY "inst members read sales" ON public.sales FOR SELECT TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "inst members write sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (institution_id = public.current_institution_id());

CREATE POLICY "inst members read notif" ON public.notifications FOR SELECT TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "inst members write notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (institution_id = public.current_institution_id());
CREATE POLICY "inst members update notif" ON public.notifications FOR UPDATE TO authenticated USING (institution_id = public.current_institution_id());

CREATE POLICY "inst members read audit" ON public.audit_logs FOR SELECT TO authenticated USING (institution_id = public.current_institution_id());
CREATE POLICY "inst members write audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (institution_id = public.current_institution_id());
