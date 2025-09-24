import { useEffect } from 'react';
import { useNavigate } from 'react-router'; // Note: NOT from '@react-router/dev/routes'

export default function CatchAll() {
  const navigate = useNavigate();

  useEffect(() => {
    const path = window.location.pathname;
    if (path.endsWith('/index.html')) {
      const cleanPath = path.replace('/index.html', '/');
      navigate(cleanPath, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
}
