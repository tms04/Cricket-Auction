import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [profilePicture, setProfilePicture] = useState<string>(user?.profilePicture || '');
    const [preview, setPreview] = useState<string>(user?.profilePicture || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setProfilePicture(user?.profilePicture || '');
        setPreview(user?.profilePicture || '');
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setPreview(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleUpdate = async () => {
        if (!preview) return;
        setLoading(true);
        setMessage(null);
        try {
            await api.updateProfile(preview);
            setProfilePicture(preview);
            setMessage('Profile picture updated!');
        } catch (err) {
            setMessage('Failed to update profile picture.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600 text-white">
            <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">My Profile</h2>
                <div className="flex flex-col items-center mb-6">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-400 mb-2">
                        {preview ? (
                            <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-700">No Image</div>
                        )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-blue-900" />
                </div>
                <button
                    onClick={handleUpdate}
                    disabled={loading || !preview}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition mb-4 disabled:opacity-50"
                >
                    {loading ? 'Updating...' : 'Update Profile Picture'}
                </button>
                {message && <div className="text-green-600 font-medium mb-2">{message}</div>}
                <div className="mt-4 text-blue-900">
                    <div><span className="font-semibold">Username:</span> {user?.username}</div>
                    <div><span className="font-semibold">Email:</span> {user?.email}</div>
                    <div><span className="font-semibold">Role:</span> {user?.role}</div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage; 