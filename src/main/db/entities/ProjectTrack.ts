import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { Project } from './Project'

@Entity("ProjectTrack")
export class ProjectTrack {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Project, { 
        eager: true,
        cascade: ["insert"]
    })
    @Index()
    @JoinColumn({ name: 'project_id' })
    project: Project

    @Column()
    scroll: number
    
    @Column()
    @Index()
    name: string

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}