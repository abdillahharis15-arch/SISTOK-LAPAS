import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, 
  Settings, Search, Menu, Plus, AlertTriangle, CheckCircle, 
  XCircle, Printer, CloudLightning, User, Key, Users, Shield, 
  LogOut, Eye, EyeOff, Edit, Trash2, RefreshCcw, X, BarChart2, Database, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID || "dummy",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sistoklapas";

// Data Demo
const initialInventory = [
  { id: 'BRG-002', nama: 'Pelubang Kertas Kecil', kategori: 'ATK', stok: 3, batasMinimum: 2, satuan: 'Box', lastUpdate: '2026-03-04' },
  { id: 'BRG-066', nama: 'Wipol', kategori: 'Kebersihan', stok: 27, batasMinimum: 10, satuan: 'Botol', lastUpdate: '2026-03-04' },
  { id: 'BRG-082', nama: 'Sapu', kategori: 'Kebersihan', stok: 35, batasMinimum: 10, satuan: 'Pcs', lastUpdate: '2026-03-04' },
];

const initialHistory = [
  { idTrx: 'TRX-1709540000', tanggal: '04/03/2026, 08.00.00', isoDate: '2026-03-04T08:00:00', jenis: 'Keluar', idBarang: 'BRG-068', namaBarang: 'Kertas A4', jumlah: 2, keterangan: 'Dipakai ruang admin', petugas: 'Admin Super' },
  { idTrx: 'TRX-1709450000', tanggal: '03/03/2026, 10.30.00', isoDate: '2026-03-03T10:30:00', jenis: 'Masuk', idBarang: 'BRG-066', namaBarang: 'Wipol', jumlah: 15, keterangan: 'Pengadaan bulanan', petugas: 'Admin Super' },
];

const initialUsers = [
  { id: 'USR-001', nip: 'admin', password: 'admin', nama: 'Admin Kepala Gudang', role: 'Admin' },
  { id: 'USR-002', nip: '12345', password: 'pegawai', nama: 'Budi (Staff Subbag Umum)', role: 'Pegawai' }
];

export default function App() {
  // Auth & User
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ nip: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');

  // Inventory
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  // History
  const [history, setHistory] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('minggu');

  // Users & Settings
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ pinOtorisasi: '123456' });

  // Notifications
  const [notification, setNotification] = useState(null);

  // Firebase Auth
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    const unsubInventory = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubHistory = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'history'), (snapshot) => {
      const histData = snapshot.docs.map(doc => doc.data());
      histData.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
      setHistory(histData);
    });

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
    });

    return () => {
      unsubInventory();
      unsubHistory();
      unsubUsers();
      unsubSettings();
    };
  }, [user]);

  const showNotification = (msg, type = 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.nip === loginForm.nip && u.password === loginForm.password);
    
    if (!foundUser && users.length === 0 && loginForm.nip === 'admin' && loginForm.password === 'admin') {
      setCurrentUser({ id: 'TEMP', nama: 'Admin Sementara', role: 'Admin', nip: 'admin' });
      setIsLoggedIn(true);
      setLoginError("");
      showNotification("Masuk sebagai Admin Sementara. Harap muat data di Pengaturan.", "success");
      return;
    }

    if (foundUser) {
      setCurrentUser(foundUser);
      setIsLoggedIn(true);
      setLoginError("");
      setActiveTab('inventory');
      showNotification(`Selamat Datang, ${foundUser.nama}!`, "success");
    } else {
      setLoginError("NIP atau Kata Sandi salah!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginForm({ nip: '', password: '' });
  };

  const handleLoadDemo = async () => {
    if (!user) return showNotification("Belum terhubung ke Database!");
    try {
      for (const item of initialInventory) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', item.id), item);
      }
      for (const log of initialHistory) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'history', log.idTrx), log);
      }
      for (const usr of initialUsers) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', usr.id), usr);
      }
      showNotification("Data demo berhasil dimuat!", "success");
    } catch (error) {
      showNotification("Error: " + error.message);
    }
  };

  const getStatus = (stok, batas) => {
    if (stok === 0) return { label: 'Habis', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle };
    if (stok <= batas) return { label: 'Menipis', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle };
    return { label: 'Aman', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle };
  };

  const categories = ["Semua", ...new Set(inventory.map(item => item.kategori))];

  const filteredData = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKategori = filterKategori === "Semua" || item.kategori === filterKategori;
      return matchSearch && matchKategori;
    });
  }, [inventory, searchTerm, filterKategori]);

  const stats = useMemo(() => {
    return {
      totalBarang: inventory.length,
      barangAman: inventory.filter(i => i.stok > i.batasMinimum).length,
      barangMenipis: inventory.filter(i => i.stok > 0 && i.stok <= i.batasMinimum).length,
      barangHabis: inventory.filter(i => i.stok === 0).length,
    };
  }, [inventory]);

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    if (chartPeriod === 'minggu') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        data.push({ name: d.toLocaleDateString('id-ID', { weekday: 'short' }), Masuk: 0, Keluar: 0 });
      }
    }

    history.forEach(log => {
      const logDate = new Date(log.isoDate);
      if (isNaN(logDate)) return;

      if (chartPeriod === 'minggu') {
        const diffDays = (today - logDate) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 7) {
          const dayName = logDate.toLocaleDateString('id-ID', { weekday: 'short' });
          const target = data.find(d => d.name === dayName);
          if (target) {
            if (log.jenis === 'Masuk') target.Masuk += log.jumlah;
            else target.Keluar += log.jumlah;
          }
        }
      }
    });

    return data;
  }, [history, chartPeriod]);

  const isAdmin = currentUser?.role === 'Admin';

  if (!isLoggedIn) {
    return (
      <div className="login-container min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
          * { font-family: 'Poppins', sans-serif !important; }
        `}</style>
        
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>

        {/* Card */}
        <div className="relative z-20 bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
          {/* Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Shield size={32} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-1">SISTOK LAPAS</h1>
            <p className="text-slate-500 text-sm font-medium">Sistem Inventaris Terpusat</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* NIP Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-slate-400"/> NIP Pegawai
              </label>
              <input 
                type="text" 
                required 
                value={loginForm.nip} 
                onChange={(e) => setLoginForm({...loginForm, nip: e.target.value})} 
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" 
                placeholder="Masukkan NIP"
              />
            </div>
            
            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Key size={16} className="text-slate-400"/> Kata Sandi
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={loginForm.password} 
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" 
                  placeholder="Kata Sandi" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5"/> 
                <p>{loginError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white font-semibold p-3 rounded-lg hover:bg-slate-800 transition-colors mt-2 flex items-center justify-center gap-2"
            >
              <Key size={18} /> Masuk Aplikasi
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} MagangHub × HN Creative</p>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`notification fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl z-50 text-white flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-500 border border-red-400' : 'bg-emerald-500 border border-emerald-400'}`}>
            {notification.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-semibold">{notification.msg}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Poppins', sans-serif !important; }
        @media print {
          aside, header, .no-print { display: none !important; }
          main { margin-left: 0 !important; width: 100% !important; }
          body { background-color: white !important; }
        }
      `}</style>
      
      <div className="min-h-screen bg-slate-50 flex text-slate-800 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed h-full z-20`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
            {isSidebarOpen && (
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-white text-lg">SISTOK LAPAS</span>
                <span className="text-[9px] text-emerald-400 font-bold mt-0.5">Portal {currentUser.role}</span>
              </div>
            )}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <Menu size={20} />
            </button>
          </div>

          <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
            <div onClick={() => setActiveTab('inventory')} className="cursor-pointer">
              <NavItem icon={LayoutDashboard} label="Dashboard & Stok" active={activeTab === 'inventory'} open={isSidebarOpen} />
            </div>
            
            {isAdmin && (
              <>
                <div onClick={() => {} } className="cursor-pointer">
                  <NavItem icon={ArrowDownToLine} label="Input Barang Masuk" open={isSidebarOpen} />
                </div>
                <div onClick={() => {} } className="cursor-pointer">
                  <NavItem icon={ArrowUpFromLine} label="Input Barang Keluar" open={isSidebarOpen} />
                </div>
              </>
            )}
            
            <div onClick={() => setActiveTab('history')} className="cursor-pointer">
              <NavItem icon={BarChart2} label="Grafik & Laporan" active={activeTab === 'history'} open={isSidebarOpen} />
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
            {isAdmin && (
              <>
                <div onClick={() => setActiveTab('users')} className="cursor-pointer">
                  <NavItem icon={Users} label="Manajemen Pegawai" active={activeTab === 'users'} open={isSidebarOpen} />
                </div>
                <div onClick={() => setActiveTab('settings')} className="cursor-pointer">
                  <NavItem icon={Settings} label="Pengaturan Sistem" active={activeTab === 'settings'} open={isSidebarOpen} />
                </div>
              </>
            )}
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 w-full mt-2">
              <LogOut size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">Keluar</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className={`flex-1 flex flex-col transition-all ${isSidebarOpen ? 'ml-64' : 'ml-20'} h-screen`}>
          {/* HEADER */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
            <h1 className="text-xl font-semibold text-slate-800">Inventaris {isAdmin ? 'Pusat' : 'Pantauan'}</h1>
            <div className="flex items-center gap-6">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari Barang..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm w-56 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-slate-900">
                  {currentUser?.nama.substring(0, 2)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold">{currentUser?.nama}</p>
                  <p className="text-xs text-slate-500">{currentUser?.role}</p>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="p-8 flex-1 overflow-y-auto">
            {activeTab === 'inventory' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard title="Total Item" value={stats.totalBarang} icon={Package} bgColor="bg-blue-50" textColor="text-blue-600" />
                  <StatCard title="Stok Aman" value={stats.barangAman} icon={CheckCircle} bgColor="bg-emerald-50" textColor="text-emerald-600" />
                  <StatCard title="Stok Menipis" value={stats.barangMenipis} icon={AlertTriangle} bgColor="bg-amber-50" textColor="text-amber-600" />
                  <StatCard title="Stok Habis" value={stats.barangHabis} icon={XCircle} bgColor="bg-red-50" textColor="text-red-600" />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Ketersediaan Stok</h2>
                      <p className="text-sm text-slate-500">Pantau dan kelola stok barang</p>
                    </div>
                    <div className="flex items-center gap-3 no-print">
                      <select className="pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-slate-500 text-xs uppercase">
                          <th className="p-4">ID</th>
                          <th className="p-4">Nama</th>
                          <th className="p-4">Kategori</th>
                          <th className="p-4 text-right">Stok</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? (
                          filteredData.map((item) => {
                            const status = getStatus(item.stok, item.batasMinimum);
                            const StatusIcon = status.icon;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-4 text-xs text-slate-500">{item.id}</td>
                                <td className="p-4 font-semibold">{item.nama}</td>
                                <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{item.kategori}</span></td>
                                <td className="p-4 text-right font-bold">{item.stok} {item.satuan}</td>
                                <td className="p-4">
                                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                                    <StatusIcon size={14} /> {status.label}
                                  </div>
                                </td>
                                <td className="p-4 text-xs text-slate-500">{item.lastUpdate}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan="6" className="p-10 text-center text-slate-500">Daftar stok kosong</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex flex-col gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2"><BarChart2 size={20} className="text-blue-600"/> Grafik Arus Barang</h2>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg self-start">
                      <button onClick={() => setChartPeriod('minggu')} className={`px-4 py-1.5 text-sm font-medium rounded ${chartPeriod === 'minggu' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>1 Minggu</button>
                    </div>
                  </div>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                        <Legend />
                        <Bar dataKey="Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Keluar" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && isAdmin && (
              <div className="max-w-2xl">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold mb-6">Pengaturan Sistem</h2>
                  <button onClick={handleLoadDemo} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 mb-4">
                    Load Demo Data
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && isAdmin && (
              <div>
                <h2 className="text-lg font-bold mb-6">Manajemen Pegawai</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <p className="text-slate-600">Fitur manajemen pengguna akan ditampilkan di sini.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {notification && (
        <div className={`notification fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl z-50 text-white flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-500/90 border border-red-400/50' : 'bg-emerald-500/90 border border-emerald-400/50'}`}>
          {notification.type === 'error' ? <XCircle size={24} /> : <CheckCircle size={24} />}
          <p className="text-sm font-semibold">{notification.msg}</p>
        </div>
      )}
    </>
  );
}

function NavItem({ icon: Icon, label, active, open }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${active ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} className="shrink-0" />
      {open && <span className="font-bold text-sm">{label}</span>}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, bgColor, textColor }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-slate-500 text-sm font-bold mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      </div>
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center ${textColor}`}>
        <Icon size={28} />
      </div>
    </div>
  );
}
