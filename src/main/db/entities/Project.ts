import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { ProjectTrack } from "./ProjectTrack"

@Entity("Project")
export class Project {
    @PrimaryGeneratedColumn()
    id: number

    @OneToMany(() => ProjectTrack, 'project', { 
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    tracks: ProjectTrack[]

    @Column()
    @Index()
    name: string

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}