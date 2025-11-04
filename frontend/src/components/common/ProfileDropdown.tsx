"use client";

import React from "react";
import {
  CreditCard,
  LogOut,
  LayoutDashboard,
  User as UserIcon,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProfileDropdownProps {
  onLogout?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onLogout }) => {
  const { user, logout, isCustomer } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = React.useState(false);

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  const getProfilePictureUrl = () => {
    // Primary: If profile_picture is already set (from backend), use it
    // This should work for all OAuth providers if backend stores it correctly
    if (user?.profile_picture) {
      // Validate URL format
      try {
        const url = new URL(user.profile_picture);
        // Only return valid HTTP/HTTPS URLs
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return user.profile_picture;
        }
      } catch (e) {
        // Invalid URL format, fall through to other options
        console.warn('Invalid profile_picture URL format:', user.profile_picture);
      }
    }

    // Secondary: For OAuth users, construct profile picture URL based on provider
    if (user?.oauth_provider && user?.oauth_id) {
      if (user.oauth_provider === 'facebook') {
        // Facebook profile picture URL format - this works publicly
        return `https://graph.facebook.com/${user.oauth_id}/picture?type=large`;
      } else if (user.oauth_provider === 'google') {
        // Google profile pictures are typically stored by backend in profile_picture
        // If not available, we can't construct it without access token
        // The backend should store Google's picture URL from OAuth response
        // For now, return undefined to show fallback
        return undefined;
      }
    }

    // Fallback: Returns undefined, will show UserIcon in AvatarFallback
    return undefined;
  };

  const profilePictureUrl = getProfilePictureUrl();
  
  // Reset error state when profile picture URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [profilePictureUrl]);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 bg-bright-blue text-white px-6 py-1.5 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold">
          <Avatar className="h-6 w-6">
            {profilePictureUrl && !imageError ? (
              <AvatarImage
                alt={user.name || "User"}
                src={profilePictureUrl}
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback>
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span>{user.name || "User"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 pb-2">
            <Avatar className="h-10 w-10">
              {profilePictureUrl && !imageError ? (
                <AvatarImage
                  alt={user.name || "User"}
                  src={profilePictureUrl}
                  onError={handleImageError}
                />
              ) : null}
              <AvatarFallback>
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="font-medium text-sm leading-none">{user.name || "User"}</p>
              <p className="text-muted-foreground text-xs leading-none">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigate(isCustomer ? '/customer/dashboard' : '/owner/dashboard');
            }}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Billing</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              navigate('/billing');
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Plan
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;


