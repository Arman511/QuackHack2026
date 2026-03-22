UPDATE users
SET
    roles = 'ADMIN,USER'
WHERE
    username = 'admin'
    AND (
        roles IS NULL
        OR trim(roles) <> 'ADMIN,USER'
    );
