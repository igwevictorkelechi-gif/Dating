import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useApp } from './store.jsx';
import { Toast } from './components/ui.jsx';
import { Login, Otp, Signup, Splash, Welcome } from './screens/Auth.jsx';
import {
  SetupAudio, SetupBeliefs, SetupCreators, SetupHobbies, SetupOrientation, SetupPhotos, SetupProfile,
} from './screens/Setup.jsx';
import {
  CreatePost, EditProfile, Home, MyProfile, Notifications, UserProfile,
} from './screens/Social.jsx';
import {
  Chat, Chats, Discover, Filters, Liked, Match, MyDatingProfile,
} from './screens/Dating.jsx';
import {
  Account, Appearance, ChangePassword, Help, Settings,
} from './screens/Settings.jsx';

// Signed in and code verified
function RequireAuth() {
  const { state } = useApp();
  if (!state.account) return <Navigate to="/welcome" replace />;
  if (!state.verified) return <Navigate to="/otp" replace />;
  return <Outlet />;
}

// ...and has finished setting up a profile
function RequireOnboarded() {
  const { state } = useApp();
  if (!state.onboarded) return <Navigate to="/setup/profile" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<Otp />} />

        <Route element={<RequireAuth />}>
          <Route path="/setup/profile" element={<SetupProfile />} />
          <Route path="/setup/orientation" element={<SetupOrientation />} />
          <Route path="/setup/beliefs" element={<SetupBeliefs />} />
          <Route path="/setup/hobbies" element={<SetupHobbies />} />
          <Route path="/setup/audio" element={<SetupAudio />} />
          <Route path="/setup/photos" element={<SetupPhotos />} />
          <Route path="/setup/creators" element={<SetupCreators />} />

          <Route element={<RequireOnboarded />}>
            <Route path="/home" element={<Home />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/post/new" element={<CreatePost />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/u/:id" element={<UserProfile />} />

            <Route path="/dating" element={<Discover />} />
            <Route path="/dating/filters" element={<Filters />} />
            <Route path="/dating/match/:id" element={<Match />} />
            <Route path="/dating/chats" element={<Chats />} />
            <Route path="/dating/chats/:id" element={<Chat />} />
            <Route path="/dating/liked" element={<Liked />} />
            <Route path="/dating/me" element={<MyDatingProfile />} />

            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/account" element={<Account />} />
            <Route path="/settings/password" element={<ChangePassword />} />
            <Route path="/settings/appearance" element={<Appearance />} />
            <Route path="/settings/help" element={<Help />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </div>
  );
}
