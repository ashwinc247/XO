import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    navigate(ref ? `/login?ref=${ref}` : "/login", { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default Register;
