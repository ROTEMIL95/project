import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { getCategoryColors } from '../../utils/categoryUtils';

export const CategoryHeader = ({ 
  categoryId,
  title,
  description,
  icon: Icon
}) => {
  const { headerBg, iconBg } = getCategoryColors(categoryId);
  
  return (
    <Card className="mb-6">
      <CardHeader className={`${headerBg} rounded-t-lg flex flex-row items-center gap-4`}>
        {Icon && (
          <div className={`${iconBg} p-2 rounded-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription className="text-white/80">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
};
