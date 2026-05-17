import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import Editor from './pages/Editor';
import { Login } from './pages/Login';
import { useAuth } from './contexts/AuthContext';

function App() {
    const { token } = useAuth();

    if (!token) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
