import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACCESS_PROFILES } from '@/config/accessProfiles';
import { MODULE_LABELS, ROLE_COLORS } from '@/types/team';
import { Shield, Eye, Plus, Pencil, Trash2 } from 'lucide-react';

export function AccessProfilesPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Perfis de acesso predefinidos que servem como base ao convidar novos colaboradores.
        As permissões podem ser personalizadas para cada membro.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESS_PROFILES.map(profile => {
          const viewCount = profile.permissions.filter(p => p.can_view).length;
          const editCount = profile.permissions.filter(p => p.can_create || p.can_update).length;
          const fullCount = profile.permissions.filter(p => p.can_view && p.can_create && p.can_update && p.can_delete).length;

          return (
            <Card key={profile.role} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className={`text-[10px] mb-2 ${ROLE_COLORS[profile.role]}`}>
                      {profile.role}
                    </Badge>
                    <CardTitle className="text-sm">{profile.label}</CardTitle>
                  </div>
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{profile.description}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" /> {viewCount} ver
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Pencil className="h-3 w-3" /> {editCount} editar
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Shield className="h-3 w-3" /> {fullCount} total
                  </span>
                </div>
                {/* Show active modules */}
                <div className="flex flex-wrap gap-1">
                  {profile.permissions
                    .filter(p => p.can_view)
                    .slice(0, 6)
                    .map(p => (
                      <Badge key={p.module_code} variant="secondary" className="text-[9px] py-0">
                        {MODULE_LABELS[p.module_code]}
                      </Badge>
                    ))}
                  {profile.permissions.filter(p => p.can_view).length > 6 && (
                    <Badge variant="secondary" className="text-[9px] py-0">
                      +{profile.permissions.filter(p => p.can_view).length - 6}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
