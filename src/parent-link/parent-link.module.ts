import { Module } from '@nestjs/common';
import { ParentLinkController } from './parent-link.controller';
import { ParentLinkService } from './parent-link.service';

@Module({
    controllers: [ParentLinkController],
    providers: [ParentLinkService],
    exports: [ParentLinkService],
})
export class ParentLinkModule { }
