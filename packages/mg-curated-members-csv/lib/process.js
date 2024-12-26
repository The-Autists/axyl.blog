const processOptions = (member, options) => {
    if (options.freeLabel) {
        member.labels = options.freeLabel;
    }

    return member;
};

const processMember = (sMember, options) => {
    const createdAtDate = sMember['Subscribed at'] ? new Date(sMember['Subscribed at']) : new Date();

    let member = {
        email: sMember['Email Address'],
        subscribed_to_emails: true,
        complimentary_plan: false,
        stripe_customer_id: null,
        created_at: createdAtDate,
        expiry: null,
        type: 'free'
    };

    return processOptions(member, options);
};

export default async (input, ctx) => {
    const {options} = ctx;
    ctx.logs = [];

    const processed = await input.map(member => processMember(member, options));

    const output = processed.reduce(function reduceByType(acc, obj) {
        let key = obj.type;
        if (!acc[key]) {
            acc[key] = [];
        }
        if (obj.info) {
            // write all changes done into our logs
            ctx.logs.push({
                info: obj.info,
                member: obj.email,
                expiry: obj.expiry
            });
        }
        acc[key].push(obj);
        return acc;
    }, {});

    return output;
};
