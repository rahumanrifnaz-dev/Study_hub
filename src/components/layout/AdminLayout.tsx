
import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAdmin />
      <main className="flex-1 admin-full py-4 lg:py-8">
        <div className="glass-card p-2 lg:p-6 min-h-[60vh]">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLayout;
