interface CardProps {
  title: string;
  description: string;
}

const Card = ({ title, description }: CardProps) => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-2 ">
        {title}
      </h1>
      <p className="text-slate-blue text-sm font-medium">{description}</p>
    </div>
  );
};

export { Card };
