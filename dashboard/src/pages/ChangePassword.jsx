import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_LENGTH} کاراکتر باشد`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('رمزهای عبور یکسان نیستند');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(newPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'تغییر رمز عبور ناموفق بود');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>تغییر رمز عبور</CardTitle>
          <CardDescription>
            {user?.mustChangePassword
              ? 'برای ادامه، ابتدا یک رمز عبور جدید برای خودتان تنظیم کنید.'
              : 'رمز عبور جدید خود را وارد کنید.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">رمز عبور جدید</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
