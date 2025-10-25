import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const statusConfig = {
  valid: {
    label: 'Valid',
    icon: <CheckCircle2 className="h-4 w-4 text-accent-foreground" />,
    className: 'bg-accent text-accent-foreground hover:bg-accent/80 border-transparent',
  },
  invalid: {
    label: 'Invalid',
    icon: <XCircle className="h-4 w-4 text-destructive-foreground" />,
    className: 'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4 text-muted-foreground animate-spin" />,
    className: 'bg-muted text-muted-foreground border-transparent',
  },
};


export function ProfileCard({ profile }: { profile: Profile }) {
  const avatarPlaceholder = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const config = statusConfig[profile.status];

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar>
            {avatarPlaceholder && (
              <Image 
                src={avatarPlaceholder.imageUrl} 
                alt={avatarPlaceholder.description}
                data-ai-hint={avatarPlaceholder.imageHint}
                width={40}
                height={40}
              />
            )}
          <AvatarFallback>{profile.email.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium text-foreground">{profile.email}</p>
          <p className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
          </p>
        </div>
        <Badge className={cn('flex items-center gap-1.5', config.className)}>
          {config.icon}
          <span className="hidden sm:inline">{config.label}</span>
        </Badge>
      </CardContent>
    </Card>
  );
}
