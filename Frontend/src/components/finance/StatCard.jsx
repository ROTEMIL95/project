import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, color, description }) => {
    const colorClasses = {
        green: {
            bgGradient: 'from-green-50 to-emerald-100',
            text: 'text-green-700',
        },
        orange: {
            bgGradient: 'from-orange-50 to-amber-100',
            text: 'text-orange-700',
        },
        indigo: {
            bgGradient: 'from-indigo-50 to-purple-100',
            text: 'text-indigo-700',
        },
        purple: {
            bgGradient: 'from-purple-50 to-fuchsia-100',
            text: 'text-purple-700',
        },
    };

    const selectedColor = colorClasses[color] || colorClasses.indigo;

    return (
        <Card className={cn(
            "relative overflow-hidden group border-2 border-transparent hover:border-indigo-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5",
            `bg-gradient-to-br ${selectedColor.bgGradient}`
        )}>
            <div className="relative p-6">
                <div className="space-y-3">
                    <CardTitle className="text-base font-semibold text-gray-600">{title}</CardTitle>
                    <div className="text-4xl font-bold text-gray-800">{value}</div>
                </div>
                {description && <p className="text-sm text-gray-400 mt-3">{description}</p>}
            </div>
        </Card>
    );
};

export default StatCard;