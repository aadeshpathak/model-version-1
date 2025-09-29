import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useSocietySettings } from '@/hooks/use-society-settings';

export const MemberProfile = () => {
  const { userData, updateUserData, userEmail } = useUser();
  const { toast } = useToast();
  const { settings: societySettings } = useSocietySettings();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    flatNumber: ''
  });

  useEffect(() => {
    if (userData) {
      setProfileForm({
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        flatNumber: userData.flatNumber || ''
      });
    }
  }, [userData]);

  const handleSave = async () => {
    try {
      await updateUserData(profileForm);
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your profile has been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-8 lg:p-12 rounded-b-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
              <p className="text-purple-100 text-lg">Manage your personal information and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-purple-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Active Member</span>
            </div>
            <div className="text-sm">Last updated: Today</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Profile Overview Card */}
        <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Personal Information</h2>
                <p className="text-blue-100">Keep your details up to date</p>
              </div>
              <Button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`transition-all duration-300 transform hover:scale-105 ${
                  isEditing
                    ? 'bg-green-500 hover:bg-green-600 shadow-lg'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30'
                }`}
              >
                {isEditing ? '💾 Save Changes' : '✏️ Edit Profile'}
              </Button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Full Name
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                        placeholder="Enter your full name"
                        className="pl-4 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        ✏️
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 group-hover:border-blue-300 transition-all duration-300">
                      <p className="text-lg font-medium text-gray-800">{userData?.fullName || 'Not set'}</p>
                      <p className="text-sm text-gray-500 mt-1">Your display name</p>
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Flat Number
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        value={profileForm.flatNumber}
                        onChange={(e) => setProfileForm({...profileForm, flatNumber: e.target.value})}
                        placeholder="e.g., A-201"
                        className="pl-4 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        🏠
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 group-hover:border-green-300 transition-all duration-300">
                      <p className="text-lg font-medium text-gray-800">{userData?.flatNumber || 'Not set'}</p>
                      <p className="text-sm text-gray-500 mt-1">Your residence</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Email Address
                  </label>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <p className="text-lg font-medium text-gray-800">{userEmail}</p>
                    <p className="text-sm text-purple-600 mt-1 flex items-center gap-1">
                      <span>🔒</span>
                      Managed by system
                    </p>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        placeholder="Enter your phone number"
                        className="pl-4 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        📱
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 group-hover:border-orange-300 transition-all duration-300">
                      <p className="text-lg font-medium text-gray-800">{userData?.phone || 'Not set'}</p>
                      <p className="text-sm text-gray-500 mt-1">For notifications</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Society Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🏢</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Society Information</h3>
                    <p className="text-sm text-gray-600">Managed by your society administrators</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Society Name</p>
                    <p className="text-lg font-semibold text-indigo-700">{societySettings.societyName || 'Green Valley Society'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Member Since</p>
                    <p className="text-lg font-semibold text-indigo-700">January 2024</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="mr-2">💾</span>
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 text-lg font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
                >
                  <span className="mr-2">❌</span>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>⚡</span>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <span className="text-2xl mb-1 block">💳</span>
                  <span className="text-sm font-medium">Pay Bills</span>
                </div>
              </Button>
              <Button className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <span className="text-2xl mb-1 block">📢</span>
                  <span className="text-sm font-medium">View Notices</span>
                </div>
              </Button>
              <Button className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <span className="text-2xl mb-1 block">📊</span>
                  <span className="text-sm font-medium">View Reports</span>
                </div>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};