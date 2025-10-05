import React, { useRef, useEffect } from 'react';

const RaindropEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        class Raindrop {
            x: number;
            y: number;
            length: number;
            speed: number;
            opacity: number;
            
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height - height;
                this.length = Math.random() * 20 + 10;
                this.speed = Math.random() * 5 + 2;
                this.opacity = Math.random() * 0.5 + 0.2;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + this.length);
                ctx.strokeStyle = `rgba(175, 215, 255, ${this.opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            update() {
                this.y += this.speed;
                if (this.y > height) {
                    this.y = 0 - this.length;
                    this.x = Math.random() * width;
                    this.speed = Math.random() * 5 + 2;
                }
                this.draw();
            }
        }

        const raindrops: Raindrop[] = [];
        const numberOfDrops = Math.floor(width / 4);

        for (let i = 0; i < numberOfDrops; i++) {
            raindrops.push(new Raindrop());
        }

        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            raindrops.forEach(drop => drop.update());
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full z-0"
        />
    );
};

export default RaindropEffect;
