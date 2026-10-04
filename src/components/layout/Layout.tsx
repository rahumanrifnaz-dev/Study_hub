import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="flex-1 container-page py-8" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
