export type LoginSearchParams = {
  next?: string | string[];
};

export type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

export type LoginButtonProps = {
  redirectPath?: string;
};
