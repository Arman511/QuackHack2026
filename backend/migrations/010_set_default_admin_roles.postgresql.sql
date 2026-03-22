UPDATE users
SET
    roles = 'ADMIN,USER'
WHERE
    username = 'admin'
    AND (
        roles IS NULL
        OR btrim (roles) <> 'ADMIN,USER'
    );
