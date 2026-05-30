
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_institution_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_of(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of(UUID) TO authenticated;
