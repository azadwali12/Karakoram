import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import './styles.css';
import { AuthProvider, useAuth } from './auth.jsx';

import Browse from './pages/Browse.jsx';
import TrekDetail from './pages/TrekDetail.jsx';
import Book from './pages/Book.jsx';
import Login from './pages/Login.jsx';
import MyBookings from './pages/MyBookings.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import Profile from './pages/Profile.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Departures from './pages/admin/Departures.jsx';
import DepartureDetail from './pages/admin/DepartureDetail.jsx';
import Bookings, { AdminBookingDetail } from './pages/admin/Bookings.jsx';
import Customers from './pages/admin/Customers.jsx';
import Schedule from './pages/admin/Schedule.jsx';
import { TreksAdmin, GuidesAdmin, PortersAdmin, EquipmentAdmin } from './pages/admin/Resources.jsx';

function Mark() {
  // two peaks, used as the logo
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true">
      <path d="M0 20 L10 4 L15 11 L21 1 L30 20 Z" fill="#7fb2c9" />
      <path d="M8.2 7 L10 4 L11.8 7 Z M19.4 4 L21 1 L22.7 4.5 Z" fill="#fff" />
    </svg>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const out = () => { logout(); navigate('/'); };
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to={user?.role === 'admin' ? '/admin' : '/'} className="brand"><Mark /> Karakoram Trails</Link>
        <nav className="topnav" aria-label="Main">
          {user?.role !== 'admin' && <NavLink to="/" end>Treks</NavLink>}
          {user?.role === 'customer' && <NavLink to="/my/bookings">My bookings</NavLink>}
          {user?.role === 'customer' && <NavLink to="/my/profile">Profile</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Office</NavLink>}
        </nav>
        {user ? (
          <>
            <span className="who">{user.name}</span>
            <button className="linkbtn" onClick={out}>Log out</button>
          </>
        ) : (
          <NavLink to="/login" className="linkbtn">Log in</NavLink>
        )}
      </div>
    </header>
  );
}

function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminLayout() {
  const links = [
    ['Overview', [['/admin', 'Dashboard', true], ['/admin/schedule', 'Staff schedule']]],
    ['Operations', [['/admin/departures', 'Departures'], ['/admin/bookings', 'Bookings & payments'], ['/admin/customers', 'Customers']]],
    ['Catalogue', [['/admin/treks', 'Treks'], ['/admin/guides', 'Guides'], ['/admin/porters', 'Porters'], ['/admin/equipment', 'Equipment']]],
  ];
  return (
    <div className="admin">
      <nav className="sidenav" aria-label="Office">
        {links.map(([group, items]) => (
          <div key={group}>
            <div className="group">{group}</div>
            {items.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
          </div>
        ))}
      </nav>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}

function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/treks/:id" element={<TrekDetail />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RequireRole role="customer" />}>
          <Route path="/book/:departureId" element={<Book />} />
          <Route path="/my/bookings" element={<MyBookings />} />
          <Route path="/my/bookings/:id" element={<BookingDetail />} />
          <Route path="/my/profile" element={<Profile />} />
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="departures" element={<Departures />} />
            <Route path="departures/:id" element={<DepartureDetail />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="treks" element={<TreksAdmin />} />
            <Route path="guides" element={<GuidesAdmin />} />
            <Route path="porters" element={<PortersAdmin />} />
            <Route path="equipment" element={<EquipmentAdmin />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="page"><h1>Page not found</h1><Link to="/">Go to treks</Link></div>} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
