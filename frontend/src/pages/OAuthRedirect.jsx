import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OAuthRedirect = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Store token securely (localStorage here for simplicity)
      localStorage.setItem("token", token);
      
      // Set authentication state
      if (setIsAuthenticated) {
        setIsAuthenticated(true);
      }

      // Redirect to home without query string
      navigate("/home", { replace: true });
    } else {
      // If no token, go to login page
      navigate("/login", { replace: true });
    }
  }, [navigate, setIsAuthenticated]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p className="text-lg text-gray-600">Logging you in...</p>
    </div>
  );
};

export default OAuthRedirect;