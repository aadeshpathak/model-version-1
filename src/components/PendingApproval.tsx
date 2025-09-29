import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { Clock, CheckCircle, X } from 'lucide-react';

export const PendingApproval = () => {
  const { approved, dismissed, handleLogout } = useUser();

  if (dismissed) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md hover-lift">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold mb-2 text-red-600">Request Dismissed</h1>
          <p className="text-muted-foreground mb-6">
            Your membership request has been dismissed by the admin.
            Please contact the society administration for more information.
          </p>
          <Button variant="outline" onClick={handleLogout} className="border-red-200 text-red-600 hover:bg-red-50 transition-spring">
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Approved!</h1>
          <p className="text-muted-foreground mb-6">Your membership has been approved. Welcome to the society!</p>
          <Button onClick={() => window.location.reload()} className="bg-gradient-primary">
            Access Your Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md hover-lift">
        <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold mb-2">Pending Approval</h1>
        <p className="text-muted-foreground mb-6">
          Your membership request has been submitted successfully.
          Please wait for admin approval. You will be notified once your request is reviewed.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            Waiting for admin review
          </div>
          <Button variant="outline" onClick={handleLogout} className="mt-2 transition-spring">
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
};