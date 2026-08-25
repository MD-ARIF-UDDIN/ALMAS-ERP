-- ====================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION - MULTI-BRANCH ERP SYSTEM
-- ====================================================================
-- INSTRUCTIONS: Copy this entire script and run it in the SQL Editor
-- of your Supabase project dashboard to set up all tables and logic.
-- ====================================================================

-- CLEAN SLATE: Drop all existing objects to prevent "already exists" errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_invoice_payment_totals() CASCADE;
DROP FUNCTION IF EXISTS public.log_sale_item_movement() CASCADE;
DROP FUNCTION IF EXISTS public.log_purchase_item_movement() CASCADE;
DROP FUNCTION IF EXISTS public.generate_sale_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_purchase_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_payment_number() CASCADE;

DROP TABLE IF EXISTS public.cash_ledger CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.purchase_items CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS contact_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_transaction_type CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

-- 1. Create Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create User Profiles (Extension of Supabase Auth)
CREATE TYPE user_role AS ENUM ('owner', 'branch_manager', 'staff');

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'staff'::user_role NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Products Table (Central Catalog)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'pcs',
    purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Branch Inventory Table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(branch_id, product_id)
);

-- 5. Create Inventory Movements Table (Stock In/Out Log)
CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out');

CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reference_id UUID,        -- References sales(id), purchases(id) or manual transaction
    description TEXT,         -- e.g., "Purchase from Supplier X", "POS Sale #12", "Damaged Item Adjustment"
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Contacts Table (Suppliers & Customers)
CREATE TYPE contact_type AS ENUM ('customer', 'supplier');

CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type contact_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    opening_balance DECIMAL(12, 2) DEFAULT 0.00, -- positive = they owe us, negative = we owe them
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Purchases (Supplier Orders)
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE payment_method AS ENUM ('cash', 'bank', 'mobile_banking');

CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE, -- Auto-generated format: P-YYYYMMDD-XXXX
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    supplier_id UUID REFERENCES public.contacts(id) NOT NULL,
    purchase_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Updated automatically by payments trigger
    payment_status payment_status NOT NULL DEFAULT 'unpaid'::payment_status, -- Updated automatically by payments trigger
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL
);

-- 8. Create Sales (Invoices)
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE, -- Auto-generated format: S-YYYYMMDD-XXXX
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    customer_id UUID REFERENCES public.contacts(id) NOT NULL,
    sale_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(12, 2) DEFAULT 0.00,
    tax DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Updated automatically by payments trigger
    payment_status payment_status NOT NULL DEFAULT 'unpaid'::payment_status, -- Updated automatically by payments trigger
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL
);

-- 9. Create Expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'rent', 'salary', 'utilities', 'stationery'
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
    payment_method payment_method DEFAULT 'cash'::payment_method,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create Payments Table (Tracks individual payments per Invoice)
CREATE TYPE payment_transaction_type AS ENUM ('customer_payment', 'supplier_payment');

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(100) UNIQUE, -- Auto-generated format: PM-YYYYMMDD-XXXX
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    type payment_transaction_type NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,       -- If payment is from a customer for a sale
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE, -- If payment is to a supplier for a purchase
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'cash'::payment_method,
    reference_number VARCHAR(100), -- e.g., transaction ID, cheque number, bank receipt ID
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_only_one_associated_invoice CHECK (
        (sale_id IS NOT NULL AND purchase_id IS NULL) OR 
        (purchase_id IS NOT NULL AND sale_id IS NULL)
    )
);

-- 11. Cash & Bank Accounts Ledger Table (Proper Balance Tracking)
CREATE TYPE account_type AS ENUM ('cash', 'bank', 'mobile_banking');
CREATE TABLE public.cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    account_type account_type NOT NULL,
    type VARCHAR(10) CHECK (type IN ('in', 'out')) NOT NULL, -- money in or money out
    amount DECIMAL(12, 2) NOT NULL,
    reference_id UUID, -- References payments(id) or expenses(id)
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ====================================================================
-- DATABASE TRIGGERS & FUNCTIONS
-- ====================================================================

-- 1. Sync payments into Sales/Purchases totals and update Statuses
CREATE OR REPLACE FUNCTION public.update_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
    v_purchase_id UUID;
    v_total_paid DECIMAL(12, 2);
    v_net_amount DECIMAL(12, 2);
BEGIN
    -- Determine if it's a sale payment or purchase payment
    IF TG_OP = 'DELETE' THEN
        v_sale_id := OLD.sale_id;
        v_purchase_id := OLD.purchase_id;
    ELSE
        v_sale_id := NEW.sale_id;
        v_purchase_id := NEW.purchase_id;
    END IF;

    -- Update Sale Paid Amount
    IF v_sale_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
        FROM public.payments
        WHERE sale_id = v_sale_id;

        SELECT net_amount INTO v_net_amount
        FROM public.sales
        WHERE id = v_sale_id;

        UPDATE public.sales
        SET 
            paid_amount = v_total_paid,
            payment_status = CASE 
                WHEN v_total_paid >= v_net_amount THEN 'paid'::payment_status
                WHEN v_total_paid > 0 THEN 'partial'::payment_status
                ELSE 'unpaid'::payment_status
            END
        WHERE id = v_sale_id;
    END IF;

    -- Update Purchase Paid Amount
    IF v_purchase_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
        FROM public.payments
        WHERE purchase_id = v_purchase_id;

        SELECT net_amount INTO v_net_amount
        FROM public.purchases
        WHERE id = v_purchase_id;

        UPDATE public.purchases
        SET 
            paid_amount = v_total_paid,
            payment_status = CASE 
                WHEN v_total_paid >= v_net_amount THEN 'paid'::payment_status
                WHEN v_total_paid > 0 THEN 'partial'::payment_status
                ELSE 'unpaid'::payment_status
            END
        WHERE id = v_purchase_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_change_update_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_totals();


-- 2. Trigger to automatically log inventory movements and adjust stock levels on new sale items
CREATE OR REPLACE FUNCTION public.log_sale_item_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_created_by UUID;
BEGIN
    SELECT branch_id, created_by INTO v_branch_id, v_created_by 
    FROM public.sales WHERE id = NEW.sale_id;

    -- Update inventory (decrease stock)
    INSERT INTO public.inventory (branch_id, product_id, quantity)
    VALUES (v_branch_id, NEW.product_id, -NEW.quantity)
    ON CONFLICT (branch_id, product_id)
    DO UPDATE SET 
        quantity = public.inventory.quantity - NEW.quantity,
        updated_at = timezone('utc'::text, now());

    -- Log movement
    INSERT INTO public.inventory_movements (branch_id, product_id, type, quantity, reference_id, description, created_by)
    VALUES (v_branch_id, NEW.product_id, 'sale'::movement_type, NEW.quantity, NEW.sale_id, 'POS Sale Item deduction', v_created_by);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_added
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.log_sale_item_movement();


-- 3. Trigger to automatically log inventory movements and adjust stock levels on new purchase items
CREATE OR REPLACE FUNCTION public.log_purchase_item_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_created_by UUID;
BEGIN
    SELECT branch_id, created_by INTO v_branch_id, v_created_by 
    FROM public.purchases WHERE id = NEW.purchase_id;

    -- Update inventory (increase stock)
    INSERT INTO public.inventory (branch_id, product_id, quantity)
    VALUES (v_branch_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (branch_id, product_id)
    DO UPDATE SET 
        quantity = public.inventory.quantity + NEW.quantity,
        updated_at = timezone('utc'::text, now());

    -- Log movement
    INSERT INTO public.inventory_movements (branch_id, product_id, type, quantity, reference_id, description, created_by)
    VALUES (v_branch_id, NEW.product_id, 'purchase'::movement_type, NEW.quantity, NEW.purchase_id, 'Supplier Purchase Item addition', v_created_by);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_purchase_item_added
  AFTER INSERT ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.log_purchase_item_movement();


-- 4. Automatically update profile table when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'owner'::public.user_role -- First user is always the owner
      ELSE 'staff'::public.user_role
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR BRANCH-WISE DATA ISOLATION
-- ====================================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read profiles (for dropdowns/lookups), but only Owner can update/delete profiles
CREATE POLICY "Profiles read access" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles owner update access" ON public.profiles FOR UPDATE TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role
);
CREATE POLICY "Profiles owner delete access" ON public.profiles FOR DELETE TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role
);

-- Branches: Anyone can read branches, but only Owner can modify
CREATE POLICY "Branches read access" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Branches owner manage access" ON public.branches FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role
);

-- Products: Anyone can read products, but only Owner/Branch Managers can add/modify products
CREATE POLICY "Products read access" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products write access" ON public.products FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner'::user_role, 'branch_manager'::user_role)
);

-- Inventory: Restricted by branch for non-owners
CREATE POLICY "Inventory branch access" ON public.inventory FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

-- Inventory Movements: Restricted by branch for non-owners
CREATE POLICY "Inventory movements branch access" ON public.inventory_movements FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

-- Contacts: Global read (customers/suppliers can be shared), but only managed by authenticated users
CREATE POLICY "Contacts read/write access" ON public.contacts FOR ALL TO authenticated USING (true);

-- Purchases, Sales, Expenses, Payments, Cash Ledger: Isolated by Branch for non-owners
CREATE POLICY "Purchases branch access" ON public.purchases FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Purchase items branch access" ON public.purchase_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
      p.branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Sales branch access" ON public.sales FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Sale items branch access" ON public.sale_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
      s.branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Expenses branch access" ON public.expenses FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Payments branch access" ON public.payments FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Ledger branch access" ON public.cash_ledger FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'::user_role OR
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
);

-- ====================================================================
-- AUTO-GENERATION TRIGGERS FOR FRIENDLY INVOICE & PAYMENT NUMBERS
-- ====================================================================

-- 1. Sales Invoice Number Generator (S-ALM-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION public.generate_sale_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    v_date_str VARCHAR(8);
    v_branch_code VARCHAR(3);
    v_prefix VARCHAR(16);
    v_count INTEGER;
    v_next_sl VARCHAR(4);
BEGIN
    -- Get the first 3 characters of the branch name (uppercased)
    SELECT COALESCE(UPPER(SUBSTRING(name FROM 1 FOR 3)), 'ALM') INTO v_branch_code
    FROM public.branches
    WHERE id = NEW.branch_id;

    v_date_str := to_char(NEW.sale_date, 'YYYYMMDD');
    v_prefix := 'S-' || v_branch_code || '-' || v_date_str || '-';
    
    SELECT COUNT(*) INTO v_count 
    FROM public.sales 
    WHERE invoice_number LIKE v_prefix || '%';
    
    v_next_sl := lpad((v_count + 1)::text, 4, '0');
    NEW.invoice_number := v_prefix || v_next_sl;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_sale_insert_invoice_num
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.generate_sale_invoice_number();

-- 2. Purchases Bill Number Generator (P-ALM-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION public.generate_purchase_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    v_date_str VARCHAR(8);
    v_branch_code VARCHAR(3);
    v_prefix VARCHAR(16);
    v_count INTEGER;
    v_next_sl VARCHAR(4);
BEGIN
    -- Get the first 3 characters of the branch name (uppercased)
    SELECT COALESCE(UPPER(SUBSTRING(name FROM 1 FOR 3)), 'ALM') INTO v_branch_code
    FROM public.branches
    WHERE id = NEW.branch_id;

    v_date_str := to_char(NEW.purchase_date, 'YYYYMMDD');
    v_prefix := 'P-' || v_branch_code || '-' || v_date_str || '-';
    
    SELECT COUNT(*) INTO v_count 
    FROM public.purchases 
    WHERE invoice_number LIKE v_prefix || '%';
    
    v_next_sl := lpad((v_count + 1)::text, 4, '0');
    NEW.invoice_number := v_prefix || v_next_sl;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_purchase_insert_invoice_num
  BEFORE INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.generate_purchase_invoice_number();

-- 3. Payment Reference Number Generator (PM-ALM-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS TRIGGER AS $$
DECLARE
    v_date_str VARCHAR(8);
    v_branch_code VARCHAR(3);
    v_prefix VARCHAR(17);
    v_count INTEGER;
    v_next_sl VARCHAR(4);
BEGIN
    -- Get the first 3 characters of the branch name (uppercased)
    SELECT COALESCE(UPPER(SUBSTRING(name FROM 1 FOR 3)), 'ALM') INTO v_branch_code
    FROM public.branches
    WHERE id = NEW.branch_id;

    v_date_str := to_char(NEW.payment_date, 'YYYYMMDD');
    v_prefix := 'PM-' || v_branch_code || '-' || v_date_str || '-';
    
    SELECT COUNT(*) INTO v_count 
    FROM public.payments 
    WHERE payment_number LIKE v_prefix || '%';
    
    v_next_sl := lpad((v_count + 1)::text, 4, '0');
    NEW.payment_number := v_prefix || v_next_sl;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_payment_insert_num
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_payment_number();

-- 4. DIAGNOSTIC RPC FUNCTION FOR CHECKING DB SCHEMA STATUS
CREATE OR REPLACE FUNCTION public.check_db_triggers()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profiles_exists', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles'),
        'profiles_rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
        'trigger_exists', EXISTS (SELECT FROM pg_trigger WHERE tgname = 'on_auth_user_created'),
        'profiles_count', (SELECT COUNT(*) FROM public.profiles),
        'branches_count', (SELECT COUNT(*) FROM public.branches),
        'contact_type_exists', EXISTS (SELECT FROM pg_type WHERE typname = 'contact_type')
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. DIAGNOSTIC RPC FUNCTION FOR AUDITING AUTH USERS
CREATE OR REPLACE FUNCTION public.diagnose_users()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'users_count', (SELECT COUNT(*) FROM auth.users),
        'identities_count', (SELECT COUNT(*) FROM auth.identities),
        'admin_user_exists', EXISTS (SELECT FROM auth.users WHERE email = 'admin@gmail.com'),
        'admin_identity_exists', EXISTS (SELECT FROM auth.identities WHERE email = 'admin@gmail.com'),
        'admin_profile_exists', EXISTS (SELECT FROM public.profiles WHERE email = 'admin@gmail.com'),
        'admin_profile_role', (SELECT role FROM public.profiles WHERE email = 'admin@gmail.com')
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
