import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un JWT valide (voir `JwtStrategy`) — attache l'utilisateur à `request.user`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
