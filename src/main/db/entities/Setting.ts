import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("Setting")
export class Setting {
    @PrimaryGeneratedColumn()
    id: number

    @Index()
    @Column()
    key: string
    
    @Index()
    @Column()
    category: string

    @Column()
    value: string

    @Index()
    @Column()
    type: string

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}