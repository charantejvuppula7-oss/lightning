import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../shared/api/apiClient.js';
import AppLayout from '../../layouts/AppLayout.jsx'
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import ProfileAvatar from './components/ProfileAvatar.jsx';
import ProfileDetailRow from './components/ProfileDetailRow.jsx';

function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      className="fixed! top-[20px]! right-[24px]! z-[9999]! p-[12px_18px]! rounded-[8px]! [color:#ffffff]! text-[14px]! font-medium! [box-shadow:0_4px_12px_rgba(0,0,0,0.15)]! flex! items-center! gap-[10px]! [animation:fadeIn_0.2s_ease]!" style={{
  backgroundColor: isError ? '#ef4444' : isSuccess ? '#10b981' : '#3b82f6'
}}
    >
      <span className={"material-symbols-outlined" + " " + "text-[18px]!"}  aria-hidden="true">
        {isError ? 'error' : isSuccess ? 'check_circle' : 'info'}
      </span>
      <span>{toast.text}</span>
      <button
        type="button"
        onClick={onClose}
        className="[background:none]! border-0! [color:#ffffff]! cursor-pointer! p-[0_0_0_8px]! text-[16px]! leading-[1]! opacity-[0.8]!"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}

export function ProfileContent({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Edit form state
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    location: '',
    bio: '',
  });

  useEffect(() => {
    let active = true;
    apiRequest('/profile/')
      .then((data) => {
        if (!active) return;
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.user_name || 'User';
        const profileData = {
          ...data,
          full_name: data.full_name || fullName,
          department: data.department || '',
          role: data.role || data.designation || '',
        };
        setProfile(profileData);
        setFormData({
          email: data.email || '',
          phone_number: data.phone_number || '',
          location: data.location || '',
          bio: data.bio || '',
        });
      })
      .catch(async () => {
        try {
          const session = await apiRequest('/auth/session/');
          if (!active) return;
          const sData = session?.user || session || {};
          const fullName = `${sData.first_name || sData.First_Name || ''} ${sData.last_name || sData.Last_Name || ''}`.trim() || sData.user_name || sData.User_Name || 'User';
          const fallbackData = {
            ...sData,
            full_name: fullName,
            employee_id: sData.employee_id || sData.Employee_Id || '',
            department: sData.department || sData.Department || '',
            role: sData.role || sData.Role || sData.designation || sData.Designation || '',
            email: sData.email || sData.Email || '',
            phone_number: sData.phone_number || sData.Phone_Number || '',
            location: sData.location || sData.Location || '',
            bio: sData.bio || sData.Bio || '',
          };
          setProfile(fallbackData);
          setFormData({
            email: fallbackData.email,
            phone_number: fallbackData.phone_number,
            location: fallbackData.location,
            bio: fallbackData.bio,
          });
        } catch {
          if (active) setToast({ text: 'Failed to load profile', type: 'error' });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        location: profile.location || '',
        bio: profile.bio || '',
      });
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.email.trim()) {
      showToast('Work email cannot be empty', 'error');
      return;
    }
    const changes = {};
    for (const field of ['email', 'phone_number', 'location']) {
      const value = formData[field].trim();
      if (value !== (profile?.[field] || '')) changes[field] = value;
    }
    if (!Object.keys(changes).length) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await apiRequest('/profile/', {
        method: 'PATCH',
        body: changes,
      });

      const fullName = `${updated.first_name || ''} ${updated.last_name || ''}`.trim() || updated.user_name || profile.full_name;
      const updatedProfile = {
        ...profile,
        ...updated,
        full_name: updated.full_name || fullName,
      };
      setProfile(updatedProfile);
      setIsEditing(false);

      showToast('Contact details updated successfully!', 'success');
    } catch (err) {
      console.error('Profile update error:', err);
      let msg = 'Failed to update profile';
      if (err.data) {
        if (typeof err.data === 'string') {
          msg = err.data;
        } else if (err.data.message) {
          msg = err.data.message;
        } else if (err.data.error) {
          msg = err.data.error;
        } else if (typeof err.data === 'object') {
          const firstKey = Object.keys(err.data)[0];
          if (firstKey) {
            const val = err.data[firstKey];
            msg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
          }
        }
      }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compute initials
  const initials = (() => {
    if (!profile) return '??';
    const name = profile.full_name || profile.user_name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'U').toUpperCase();
  })();

  if (loading) {
    return (
      <div className="flex! flex-col! items-center! justify-center! min-h-[400px]! gap-[12px]! w-full!">
        <div className="w-[32px]! h-[32px]! [border:3px_solid_var(--color-slate-200)]! [border-top-color:var(--color-primary)]! rounded-[50%]! [animation:spin_0.7s_linear_infinite]!" />
        <span className="[color:var(--color-slate-500)]! text-[14px]! font-medium!">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <div className="flex! flex-col! w-full! [background-color:var(--color-slate-50)]! min-h-[100%]! box-border! [font-family:'Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]!">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Top Header Card */}
      <div className="[background-color:var(--color-white)]! [border-bottom:1px_solid_var(--color-slate-200)]! p-[18px_32px]! flex! items-center! justify-between! w-full! box-border!">
        <div className="flex! items-center! gap-[10px]!">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              className="[background:transparent]! [border:none]! [padding:4px]! [cursor:pointer]! [display:flex]! [align-items:center]! [justify-content:center]! [border-radius:6px]! [transition:background_0.15s_ease]!"
              ariaLabel="Back"
              title="Back"
            >
              <span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-slate-500)]!"} >
                arrow_back
              </span>
            </Button>
          )}
          <h1 className="text-[18px]! font-bold! [color:var(--color-slate-900)]! m-0! tracking-[-0.2px]!">My Profile</h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-[24px_32px]! flex! flex-col! gap-[18px]! w-full! box-border!">
        {/* Profile Hero Card */}
        <div className="[background-color:var(--color-white)]! rounded-[14px]! [border:1px_solid_var(--color-slate-200)]! p-[22px_28px]! [box-shadow:0_1px_3px_rgba(0,0,0,0.02)]! box-border! w-full!">
          <div className="flex! items-center! gap-[22px]!">
            <ProfileAvatar
              initials={initials}
              onPhotoChange={() => showToast('Photo updated', 'info')}
            />

            {/* Profile Info */}
            <div>
              <div className="text-[18px]! font-bold! [color:var(--color-slate-900)]! mb-[4px]! tracking-[-0.2px]!">
                {profile?.full_name || 'User Name'}
              </div>
              <div className="text-[13.5px]! [color:var(--color-slate-500)]! font-medium!">
                {profile?.role || 'Team Member'}
                {profile?.employee_id ? ` · Employee ${profile.employee_id}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Details Card */}
        <div className="[background-color:var(--color-white)]! rounded-[14px]! [border:1px_solid_var(--color-slate-200)]! p-[22px_28px]! [box-shadow:0_1px_3px_rgba(0,0,0,0.02)]! box-border! w-full!">
          <div className="text-[15.5px]! font-bold! [color:var(--color-slate-900)]! pb-[14px]! [border-bottom:1px_solid_var(--color-slate-100)]! tracking-[-0.1px]!">Basic details</div>
          <div className="flex! flex-col!">
            <ProfileDetailRow label="Full name" value={profile?.full_name} />
            <ProfileDetailRow label="Employee ID" value={profile?.employee_id} />
            <ProfileDetailRow label="Department" value={profile?.department} />
            <ProfileDetailRow label="Role" value={profile?.role} isLast />
          </div>
        </div>

        {/* Contact Card */}
        <div className="[background-color:var(--color-white)]! rounded-[14px]! [border:1px_solid_var(--color-slate-200)]! p-[22px_28px]! [box-shadow:0_1px_3px_rgba(0,0,0,0.02)]! box-border! w-full!">
          <div className="flex! items-center! justify-between! pb-[14px]! [border-bottom:1px_solid_var(--color-slate-100)]!">
            <div className="text-[15.5px]! font-bold! [color:var(--color-slate-900)]! pb-[14px]! [border-bottom:1px_solid_var(--color-slate-100)]! tracking-[-0.1px]!">Contact</div>
            {!isEditing ? (
              <Button
                type="button"
                onClick={() => {
                  setFormData({
                    email: profile?.email || '',
                    phone_number: profile?.phone_number || '',
                    location: profile?.location || '',
                    bio: profile?.bio || '',
                  });
                  setIsEditing(true);
                }}
                className="[display:inline-flex]! [align-items:center]! [gap:5px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! [border-radius:6px]! [padding:5px_12px]! [font-size:13px]! [font-weight:600]! [color:var(--color-slate-900)]! [cursor:pointer]! [transition:all_0.15s_ease]! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]!"
              >
                <span className={"material-symbols-outlined" + " " + "text-[15px]!"} >
                  edit
                </span>
                <span>Edit</span>
              </Button>
            ) : (
              <div className="flex! items-center! gap-[8px]!">
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="[background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! [border-radius:6px]! [padding:5px_12px]! [font-size:13px]! [font-weight:600]! [color:var(--color-slate-600)]! [cursor:pointer]! [transition:all_0.15s_ease]!"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  loading={saving}
                  loadingText="Saving..."
                  className="[background-color:var(--color-primary)]! [border:none]! [border-radius:6px]! [padding:5px_14px]! [font-size:13px]! [font-weight:600]! [color:var(--color-white)]! [cursor:pointer]! [box-shadow:0_1px_2px_rgba(37,99,235,0.25)]! [transition:all_0.15s_ease]!"
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="flex! flex-col!">
              <ProfileDetailRow label="Work email">
                {profile?.email ? (
                  <a
                    href={`mailto:${profile.email}`}
                    className="[color:var(--color-slate-900)]! no-underline!"
                  >
                    {profile.email}
                  </a>
                ) : (
                  '—'
                )}
              </ProfileDetailRow>
              <ProfileDetailRow label="Mobile no." value={profile?.phone_number} />
              <ProfileDetailRow
                label="Work location"
                value={profile?.location}
                isLast={!profile?.alternate_email}
              />
              {profile?.alternate_email && (
                <ProfileDetailRow label="Alternate email" value={profile.alternate_email} isLast />
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-[4px]!">
              <div className="flex! flex-col!">
                <ProfileDetailRow label="Work email" required rowClassName="[padding:12px_0]!">
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. user@tachyonautomations.com"
                    inputClassName="[width:100%]! [max-width:380px]! [padding:8px_12px]! [border-radius:8px]! [border:1px_solid_var(--color-slate-300)]! [font-size:13.5px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! [outline:none]! [box-sizing:border-box]! [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease]!"
                    required
                    ariaLabel="Work email"
                  />
                </ProfileDetailRow>

                <ProfileDetailRow label="Mobile no." rowClassName="[padding:12px_0]!">
                  <Input
                    name="phone_number"
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="e.g. 87268399282"
                    inputClassName="[width:100%]! [max-width:380px]! [padding:8px_12px]! [border-radius:8px]! [border:1px_solid_var(--color-slate-300)]! [font-size:13.5px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! [outline:none]! [box-sizing:border-box]! [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease]!"
                    ariaLabel="Mobile number"
                  />
                </ProfileDetailRow>

                <ProfileDetailRow label="Work location" isLast rowClassName="[padding:12px_0]!">
                  <Input
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Delhi, India"
                    inputClassName="[width:100%]! [max-width:380px]! [padding:8px_12px]! [border-radius:8px]! [border:1px_solid_var(--color-slate-300)]! [font-size:13.5px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! [outline:none]! [box-sizing:border-box]! [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease]!"
                    ariaLabel="Work location"
                  />
                </ProfileDetailRow>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function getCachedRole() {
  try {
    const raw =
      localStorage.getItem('pm_current_user') ||
      sessionStorage.getItem('pm_current_user') ||
      localStorage.getItem('user_session') ||
      sessionStorage.getItem('user_session');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return String(user.Role || user.role || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export default function MyProfile({ user, onBack, embedded = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPmProfile = location.pathname.startsWith('/pm/');
  const isAdminProfile = location.pathname.startsWith('/admin/');
  const cachedRole = user ? (user.role || '').toLowerCase() : getCachedRole();

  useEffect(() => {
    if (location.pathname === '/profile') {
      const rolePath =
        cachedRole === 'pm' || cachedRole === 'project manager'
          ? '/pm/profile'
          : cachedRole === 'admin' || cachedRole === 'administrator'
          ? '/admin/profile'
          : '/user/profile';
      navigate(rolePath, { replace: true });
    }
  }, [cachedRole, location.pathname, navigate]);

  const handleBack = onBack || (() => {
    if (isPmProfile || window.history.length > 1) {
      navigate(-1);
    } else if (isAdminProfile) {
      navigate('/admin/dashboard');
    } else {
      navigate('/user/dashboard');
    }
  });

  if (embedded) {
    return <ProfileContent onBack={handleBack} />;
  }

  return (
    <AppLayout user={user}>
      <ProfileContent onBack={handleBack} />
    </AppLayout>
  );
}
