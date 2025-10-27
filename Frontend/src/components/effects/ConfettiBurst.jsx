import React from 'react';
import { motion } from 'framer-motion';

const PARTICLE_COUNT = 20;
const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const ConfettiParticle = ({ onAnimationComplete }) => {
    const duration = Math.random() * 1.2 + 0.6;
    const delay = Math.random() * 0.2;
    const x = (Math.random() - 0.5) * 250;
    const y = (Math.random() - 0.5) * 250;
    const scale = Math.random() * 0.7 + 0.5;
    const rotate = Math.random() * 520 - 260;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    return (
        <motion.div
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: color,
                transformOrigin: 'center center',
                zIndex: 100,
            }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
            animate={{
                opacity: [1, 1, 0],
                x: x,
                y: y,
                scale: scale,
                rotate: rotate,
            }}
            transition={{
                duration,
                delay,
                ease: "circOut",
            }}
            onAnimationComplete={onAnimationComplete}
        />
    );
};

export default function ConfettiBurst({ onComplete }) {
    // We only want the onComplete to be called once, so we'll attach it to just one particle.
    const handleOneParticleComplete = () => {
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <>
            {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
                <ConfettiParticle key={index} onAnimationComplete={index === 0 ? handleOneParticleComplete : undefined} />
            ))}
        </>
    );
}