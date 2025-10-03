import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Users,
  TrendingUp,
  Sparkles,
  Building2,
  CreditCard,
  PieChart,
  Zap,
  Heart,
  Star,
  ChevronDown,
  Play,
  CheckCircle2,
  IndianRupee,
  Calendar,
  Bell,
  FileText,
  BarChart3,
  Activity
} from 'lucide-react';

// Custom hook for typing animation
const useTypingAnimation = (texts: string[], speed: number = 100) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const text = texts[currentTextIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(text.slice(0, currentText.length + 1));
        if (currentText === text) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setCurrentText(text.slice(0, currentText.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isDeleting, texts, speed]);

  return currentText;
};

export const LoginForm = () => {
  const { handleLogin } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'member' | 'admin'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequestMode, setIsRequestMode] = useState(false);
  const [isRequestJoin, setIsRequestJoin] = useState(false);

  // Typing animation for headlines
  const typingText = useTypingAnimation([
    'Smart Society Management',
    'Secure Payments',
    'Member-Friendly Dashboards',
    'Automated Billing',
    'Community Analytics'
  ], 50);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let userCredential;
      if (isRequestJoin) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          email,
          role: 'member',
          approved: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
        handleLogin('member', email, userCredential.user.uid, false, false);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          const userRef = doc(db, 'users', userCredential.user.uid);
          const userSnap = await getDoc(userRef);
          let role = userType; // default
          let approved = false;
          let dismissed = false;
          if (userSnap.exists()) {
            const data = userSnap.data();
            role = data.role;
            approved = data.approved || false;
            dismissed = data.dismissed || false;
          } else {
            // Create new user
            await setDoc(userRef, {
              email,
              role: userType,
              approved: false,
              dismissed: false,
              createdAt: new Date().toISOString(),
            });
          }
          handleLogin(role, email, userCredential.user.uid, approved, dismissed);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = 'An error occurred during authentication';

      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      }

      toast({
        title: "Authentication Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
    }
    setIsLoading(false);
  };

  const fillDemo = (type: 'member' | 'admin') => {
    setUserType(type);
    setEmail(type === 'admin' ? 'admin@gmail.com' : 'member@example.com');
    setPassword('');
  };

  if (!showForm) {
    // Enhanced 2025 SaaS-Style Landing Page
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden font-['Inter',sans-serif]">
        {/* Dynamic Background Shapes with Parallax */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large gradient orbs */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 -right-32 w-80 h-80 bg-gradient-to-br from-pink-400/25 to-orange-500/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>

          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-20 w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-bounce delay-300"></div>
          <div className="absolute top-40 right-32 w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg rotate-45 animate-pulse delay-700"></div>
          <div className="absolute bottom-32 left-16 w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute top-1/2 right-20 w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full animate-pulse delay-1200"></div>

          {/* Abstract 3D blobs */}
          <div className="absolute top-16 right-1/4 w-24 h-24 bg-gradient-to-br from-indigo-400/40 to-purple-500/40 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-1/3 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-rose-500/30 rounded-full blur-2xl animate-float delay-500"></div>
          <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-gradient-to-br from-cyan-400/35 to-blue-500/35 rounded-full blur-lg animate-float delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-orange-400/50 to-red-500/50 rounded-lg animate-spin"></div>
          <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-gradient-to-br from-green-400/40 to-emerald-500/40 rounded-full animate-bounce"></div>
          <div className="absolute top-3/4 right-1/2 w-8 h-8 bg-gradient-to-br from-yellow-400/60 to-orange-500/60 rounded-full animate-pulse"></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between p-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              PayMySociety
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Pricing</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">About</a>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
            >
              Sign In
            </Button>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="md:hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Get Started
          </Button>
        </nav>

        {/* Hero Section */}
        <section className="relative z-10 px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div className="space-y-8 animate-fade-in-up">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-full px-4 py-2 text-sm text-blue-700 font-medium shadow-sm">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  ✨ Trusted by 10,000+ Communities
                </div>

                {/* Main Headline with Typing Animation */}
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold leading-tight">
                    <span className="text-gray-900">Revolutionize</span>
                    <br />
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                      {typingText}
                    </span>
                    <span className="animate-pulse text-purple-600">|</span>
                  </h1>

                  <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                    Transform your residential community with intelligent financial management,
                    automated billing, and seamless member experiences. Built for modern societies.
                  </p>
                </div>

                {/* Glassmorphism Feature Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="group bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 cursor-pointer">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
                    <p className="text-sm text-gray-600">Bank-grade security with encrypted transactions</p>
                  </div>

                  <div className="group bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:-rotate-1 cursor-pointer">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white group-hover:bounce" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Member Portal</h3>
                    <p className="text-sm text-gray-600">Intuitive dashboards for seamless management</p>
                  </div>

                  <div className="group bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 cursor-pointer">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Smart Analytics</h3>
                    <p className="text-sm text-gray-600">Real-time insights and financial reporting</p>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform relative z-10" />
                    <span className="relative z-10">Get Started Free</span>
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform relative z-10" />
                  </Button>

                  <Button
                    variant="outline"
                    className="px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                  >
                    <Play className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Button>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Free 14-day trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>

              {/* Right Content - 3D Dashboard Preview */}
              <div className="relative animate-fade-in-right">
                {/* Main Dashboard Card */}
                <div className="bg-white/80 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-rotate-1">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-bold text-lg">Green Valley Society</h3>
                          <p className="text-gray-500 text-sm">Live Dashboard</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Live</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200/50 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-blue-900 text-2xl font-bold">247</p>
                        <p className="text-blue-700 text-sm font-medium">Active Members</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border border-green-200/50 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <IndianRupee className="w-5 h-5 text-green-600" />
                          <span className="text-xs text-green-600 font-bold">+12%</span>
                        </div>
                        <p className="text-green-900 text-2xl font-bold">₹2.4L</p>
                        <p className="text-green-700 text-sm font-medium">This Month</p>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-purple-900 font-semibold">Revenue Trend</h4>
                        <PieChart className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex items-end gap-2 h-16">
                        {[40, 60, 45, 80, 65, 90, 75].map((height, i) => (
                          <div
                            key={i}
                            className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm flex-1 transition-all duration-500 hover:scale-110"
                            style={{ height: `${height}%` }}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-3">
                      <h4 className="text-gray-900 font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Recent Activity
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200/50">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">Payment received from Flat A-201</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200/50">
                          <Bell className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-800">Maintenance notice sent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating 3D Elements */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-2xl animate-float opacity-80"></div>
                <div className="absolute -bottom-8 -left-8 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-xl animate-float delay-1000 opacity-90"></div>
                <div className="absolute top-1/2 -right-4 w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg rotate-45 shadow-lg animate-bounce delay-500"></div>

                {/* Society-themed illustrations */}
                <div className="absolute -top-12 left-8 opacity-60 animate-float delay-700">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Home className="w-10 h-10 text-white" />
                  </div>
                </div>

                <div className="absolute bottom-8 right-12 opacity-70 animate-float delay-1200">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section with Scroll Animation */}
        <section id="features" className="relative z-10 px-6 lg:px-8 py-32 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Everything You Need to
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Manage Your Society
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Comprehensive tools designed specifically for residential community management,
                from billing to communication.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Cards with Glassmorphism */}
              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-100">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Billing</h3>
                <p className="text-gray-600 leading-relaxed">
                  Set up recurring bills, send reminders automatically, and track payments in real-time.
                  Never miss a due payment again.
                </p>
              </div>

              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-200">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Member Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Complete member profiles, approval workflows, and communication tools.
                  Keep your community connected and informed.
                </p>
              </div>

              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Financial Analytics</h3>
                <p className="text-gray-600 leading-relaxed">
                  Detailed reports, expense tracking, and financial insights.
                  Make data-driven decisions for your community.
                </p>
              </div>

              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-400">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Notifications</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automated reminders, maintenance alerts, and community announcements.
                  Keep everyone in the loop.
                </p>
              </div>

              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-500">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bank-Level Security</h3>
                <p className="text-gray-600 leading-relaxed">
                  End-to-end encryption, secure payments, and GDPR compliance.
                  Your community's data is always protected.
                </p>
              </div>

              <div className="group bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 animate-fade-in-up delay-600">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Support</h3>
                <p className="text-gray-600 leading-relaxed">
                  Round-the-clock customer support, comprehensive documentation,
                  and community forums. We're here when you need us.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 px-6 lg:px-8 py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Society?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join thousands of communities already using PayMySociety to streamline their operations
              and build stronger, more connected neighborhoods.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-white text-purple-600 hover:bg-gray-50 px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all duration-300 group"
              >
                <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300"
              >
                Schedule Demo
              </Button>
            </div>

            <p className="text-blue-200 text-sm mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Floating elements in CTA */}
          <div className="absolute top-10 left-10 w-6 h-6 bg-white/20 rounded-full animate-bounce"></div>
          <div className="absolute bottom-10 right-10 w-8 h-8 bg-white/20 rounded-lg rotate-45 animate-pulse"></div>
          <div className="absolute top-1/2 left-20 w-4 h-4 bg-white/30 rounded-full animate-float"></div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-6 lg:px-8 py-12 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold">PayMySociety</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Modern society management made simple and secure.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">© 2025 PayMySociety. All rights reserved.</p>
              <div className="flex items-center gap-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookies</a>
              </div>
            </div>
          </div>
        </footer>

        {/* Scroll to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50 opacity-0 animate-fade-in"
          style={{ animationDelay: '2s' }}
        >
          <ChevronDown className="w-6 h-6 text-white transform rotate-[-90deg] mx-auto" />
        </button>
      </div>
    );
  }

  // Login Form - Modern SaaS Design
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-pink-400/15 to-orange-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-gray-600 hover:text-gray-900 hover:bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl transition-all duration-300 group"
            >
              <ArrowRight className="w-4 h-4 mr-2 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </div>

          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg font-medium">Sign in to your society account</p>
          </div>

          <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-2xl hover:shadow-3xl transition-all duration-500 hover-lift">
            {!isRequestJoin && (
              <div className="space-y-6 mb-8">
                <div className="flex gap-2 p-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl shadow-inner">
                  <Button
                    type="button"
                    variant={userType === 'member' ? 'default' : 'ghost'}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                      userType === 'member'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setUserType('member')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Member
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'admin' ? 'default' : 'ghost'}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                      userType === 'admin'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setUserType('admin')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </div>

                {userType === 'member' && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">New to the society?</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRequestJoin(true)}
                      className="w-full border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 py-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Request to Join
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isRequestJoin && (
              <div className="mb-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Request to Join</h3>
                  <p className="text-sm text-muted-foreground">Create your account and wait for admin approval</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestJoin(false)}
                  className="w-full mb-4"
                >
                  ← Back to Sign In
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 rounded-xl bg-gray-50/50 focus:bg-white transition-all duration-300 hover:border-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 rounded-xl bg-gray-50/50 focus:bg-white transition-all duration-300 hover:border-gray-300"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 rounded-xl group"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    {isRequestJoin ? 'Requesting...' : 'Signing In...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                    {isRequestJoin ? 'Request to Join' : `Sign In as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center mb-3">Demo Admin: admin@gmail.com / admin@1234</p>
              <p className="text-sm text-muted-foreground text-center">New members: Click "Request to Join" under member sign-in</p>
            </div>
          </Card>

          <div className="mt-8 text-center text-gray-600">
            <p className="text-sm">✨ Online Payments • 📊 Financial Tracking • 🏢 Member Management</p>
          </div>
        </div>
      </div>
    </div>
  );
};
