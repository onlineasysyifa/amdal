-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- Migration 02: Row Level Security (RLS) & Policies
-- ==============================================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_flow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_sampling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transport_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if authenticated user is active
CREATE OR REPLACE FUNCTION is_authenticated_and_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically when new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'petugas'),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- POLICIES: profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- POLICIES: Operational & Master Tables (Rooms, Waste Types, Parameters, Transporters)
-- READ: Authenticated users can read
-- WRITE: Authenticated users can insert/update/delete
-- ANON: STRICTLY DENIED (Default when RLS is enabled and no anon policy exists)
-- ------------------------------------------------------------------------------

-- Master: rooms
CREATE POLICY "Auth users can view rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert rooms" ON rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update rooms" ON rooms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete rooms" ON rooms FOR DELETE TO authenticated USING (true);

-- Master: waste_types
CREATE POLICY "Auth users can view waste_types" ON waste_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert waste_types" ON waste_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update waste_types" ON waste_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete waste_types" ON waste_types FOR DELETE TO authenticated USING (true);

-- Master: ipal_parameters
CREATE POLICY "Auth users can view ipal_parameters" ON ipal_parameters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ipal_parameters" ON ipal_parameters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ipal_parameters" ON ipal_parameters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ipal_parameters" ON ipal_parameters FOR DELETE TO authenticated USING (true);

-- Master: transporters
CREATE POLICY "Auth users can view transporters" ON transporters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert transporters" ON transporters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update transporters" ON transporters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete transporters" ON transporters FOR DELETE TO authenticated USING (true);

-- IPAL Operations
CREATE POLICY "Auth users can view ipal_flow" ON ipal_flow_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ipal_flow" ON ipal_flow_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ipal_flow" ON ipal_flow_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ipal_flow" ON ipal_flow_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view ipal_sampling" ON ipal_sampling_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ipal_sampling" ON ipal_sampling_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ipal_sampling" ON ipal_sampling_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ipal_sampling" ON ipal_sampling_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view ipal_test_results" ON ipal_test_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ipal_test_results" ON ipal_test_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ipal_test_results" ON ipal_test_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ipal_test_results" ON ipal_test_results FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view ipal_maintenance" ON ipal_maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert ipal_maintenance" ON ipal_maintenance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ipal_maintenance" ON ipal_maintenance_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ipal_maintenance" ON ipal_maintenance_records FOR DELETE TO authenticated USING (true);

-- Limbah B3 Operations
CREATE POLICY "Auth users can view waste_collections" ON waste_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert waste_collections" ON waste_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update waste_collections" ON waste_collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete waste_collections" ON waste_collections FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view waste_collection_items" ON waste_collection_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert waste_collection_items" ON waste_collection_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update waste_collection_items" ON waste_collection_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete waste_collection_items" ON waste_collection_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view tps_receipts" ON tps_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert tps_receipts" ON tps_receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tps_receipts" ON tps_receipts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete tps_receipts" ON tps_receipts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view tps_receipt_items" ON tps_receipt_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert tps_receipt_items" ON tps_receipt_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tps_receipt_items" ON tps_receipt_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete tps_receipt_items" ON tps_receipt_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view waste_transports" ON waste_transports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert waste_transports" ON waste_transports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update waste_transports" ON waste_transports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete waste_transports" ON waste_transports FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view waste_transport_items" ON waste_transport_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert waste_transport_items" ON waste_transport_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update waste_transport_items" ON waste_transport_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete waste_transport_items" ON waste_transport_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view tps_adjustments" ON tps_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert tps_adjustments" ON tps_adjustments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tps_adjustments" ON tps_adjustments FOR UPDATE TO authenticated USING (true);

-- Inspeksi & Tindak Lanjut
CREATE POLICY "Auth users can view tps_inspections" ON tps_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert tps_inspections" ON tps_inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tps_inspections" ON tps_inspections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete tps_inspections" ON tps_inspections FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view corrective_actions" ON corrective_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert corrective_actions" ON corrective_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update corrective_actions" ON corrective_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete corrective_actions" ON corrective_actions FOR DELETE TO authenticated USING (true);

-- Dokumen & Persetujuan
CREATE POLICY "Auth users can view document_attachments" ON document_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert document_attachments" ON document_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can delete document_attachments" ON document_attachments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view report_approvals" ON report_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert report_approvals" ON report_approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update report_approvals" ON report_approvals FOR UPDATE TO authenticated USING (true);

-- Audit Logs (Insert & Select only, NO UPDATE / DELETE allowed for integrity)
CREATE POLICY "Auth users can view audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Application Settings
CREATE POLICY "Auth users can view application_settings" ON application_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can update application_settings" ON application_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can insert application_settings" ON application_settings FOR INSERT TO authenticated WITH CHECK (true);
