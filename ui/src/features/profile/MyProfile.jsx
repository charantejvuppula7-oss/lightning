import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient.js';
import PageLayout from '../../layouts/PageLayout.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ProfileAvatar from './components/ProfileAvatar.jsx';
import ProfileDetailRow from './components/ProfileDetailRow.jsx';

function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 9999,
        padding: '12px 18px',
        borderRadius: '8px',
        backgroundColor: isError ? '#ef4444' : isSuccess ? '#10b981' : '#3b82f6',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
        {isError ? 'error' : isSuccess ? 'check_circle' : 'info'}
      </span>
      <span>{toast.text}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '0 0 0 8px',
          fontSize: '16px',
          lineHeight: 1,
          opacity: 0.8,
        }}
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={{ color: 'var(--color-slate-500)', fontSize: '14px', fontWeight: '500' }}>
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              style={styles.backBtn}
              ariaLabel="Back"
              title="Back"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-slate-500)' }}>
                arrow_back
              </span>
            </Button>
          )}
          <h1 style={styles.headerTitle}>My Profile</h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.contentArea}>
        {/* Profile Hero Card */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <ProfileAvatar
              initials={initials}
              onPhotoChange={() => showToast('Photo updated', 'info')}
            />

            {/* Profile Info */}
            <div>
              <div style={styles.profileName}>
                {profile?.full_name || 'User Name'}
              </div>
              <div style={styles.profileSubtitle}>
                {profile?.role || 'Team Member'}
                {profile?.employee_id ? ` · Employee ${profile.employee_id}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Details Card */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Basic details</div>
          <div style={styles.detailsList}>
            <ProfileDetailRow label="Full name" value={profile?.full_name} />
            <ProfileDetailRow label="Employee ID" value={profile?.employee_id} />
            <ProfileDetailRow label="Department" value={profile?.department} />
            <ProfileDetailRow label="Role" value={profile?.role} isLast />
          </div>
        </div>

        {/* Contact Card */}
        <div style={styles.card}>
          <div style={styles.contactHeader}>
            <div style={styles.cardTitle}>Contact</div>
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
                style={styles.editBtn}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  edit
                </span>
                <span>Edit</span>
              </Button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  style={styles.inlineCancelBtn}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  loading={saving}
                  loadingText="Saving..."
                  style={styles.inlineSaveBtn}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div style={styles.detailsList}>
              <ProfileDetailRow label="Work email">
                {profile?.email ? (
                  <a
                    href={`mailto:${profile.email}`}
                    style={{ color: 'var(--color-slate-900)', textDecoration: 'none' }}
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
            <form onSubmit={handleSave} style={{ marginTop: '4px' }}>
              <div style={styles.detailsList}>
                <ProfileDetailRow label="Work email" required style={{ padding: '12px 0' }}>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. user@tachyonautomations.com"
                    inputStyle={styles.inlineInput}
                    required
                    ariaLabel="Work email"
                  />
                </ProfileDetailRow>

                <ProfileDetailRow label="Mobile no." style={{ padding: '12px 0' }}>
                  <Input
                    name="phone_number"
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="e.g. 87268399282"
                    inputStyle={styles.inlineInput}
                    ariaLabel="Mobile number"
                  />
                </ProfileDetailRow>

                <ProfileDetailRow label="Work location" isLast style={{ padding: '12px 0' }}>
                  <Input
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Delhi, India"
                    inputStyle={styles.inlineInput}
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
    <PageLayout user={user}>
      <ProfileContent onBack={handleBack} />
    </PageLayout>
  );
}

const styles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: 'var(--color-slate-50)',
    minHeight: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  headerCard: {
    backgroundColor: 'var(--color-white)',
    borderBottom: '1px solid var(--color-slate-200)',
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'background 0.15s ease',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-slate-900)',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  contentArea: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: '14px',
    border: '1px solid var(--color-slate-200)',
    padding: '22px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    boxSizing: 'border-box',
    width: '100%',
  },
  profileName: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-slate-900)',
    marginBottom: '4px',
    letterSpacing: '-0.2px',
  },
  profileSubtitle: {
    fontSize: '13.5px',
    color: 'var(--color-slate-500)',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: '15.5px',
    fontWeight: '700',
    color: 'var(--color-slate-900)',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--color-slate-100)',
    letterSpacing: '-0.1px',
  },
  contactHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--color-slate-100)',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-slate-200)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-slate-900)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  inlineInput: {
    width: '100%',
    maxWidth: '380px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-slate-300)',
    fontSize: '13.5px',
    color: 'var(--color-slate-900)',
    backgroundColor: 'var(--color-white)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inlineCancelBtn: {
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-slate-300)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-slate-600)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  inlineSaveBtn: {
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 14px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-white)',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
    transition: 'all 0.15s ease',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '12px',
    width: '100%',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color-slate-200)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
