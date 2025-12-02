import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const mapping = [
  ["Khumo Malete", "KhumoMalete@kingedwardvii.co.uk"],
  ["Dr Laszlo Agocs", "DrLaszloAgocs@kingedwardvii.co.uk"],
  ["Bibian Koyi", "BibianKoyi@kingedwardvii.co.uk"],
  ["Miriam Buenafe", "MiriamBuenafe@kingedwardvii.co.uk"],
  ["Sibo Sibanda", "SiboSibanda@kingedwardvii.co.uk"],
  ["Jennifer Tirant", "JenniferTirant@kingedwardvii.co.uk"],
  ["Dr Dermot McGuckin", "DrDermotMcGuckin@kingedwardvii.co.uk"],
  ["Julie Robinson", "JulieRobinson@kingedwardvii.co.uk"],
  ["Bisrat Haile", "BisratHaile@kingedwardvii.co.uk"],
  ["Bagwantee Hurbungs", "BagwanteeHurbungs@kingedwardvii.co.uk"],
  ["Mary Grace Alejandria", "MaryGraceAlejandria@kingedwardvii.co.uk"],
  ["Ana Cristina Aranda", "acaranda@kingedwardvii.co.uk"],
  ["Dr Amour Patel", "DrAmourPatel@kingedwardvii.co.uk"],
  ["Mariel Bulahan", "MarielBulahan@kingedwardvii.co.uk"],
  ["Christine Takundwa", "ChristineTakundwa@kingedwardvii.co.uk"],
  ["Petronella Phiri", "PetronellaPhiri@kingedwardvii.co.uk"],
  ["Patricia Oliva Guerra", "PatriciaOlivaGuerra@kingedwardvii.co.uk"],
  ["Melody Cruz", "MelodyCruz@kingedwardvii.co.uk"],
  ["Regina Baah", "ReginaBaah@kingedwardvii.co.uk"],
  ["Margaret Gaspar", "MargaretGaspar@kingedwardvii.co.uk"],
  ["Athina Tsoupanoudi", "AthinaTsoupanoudi@kingedwardvii.co.uk"],
  ["Remya Mathew", "rmathew@kingedwardvii.co.uk"],
  ["Lucrezia Naglieri", "LucreziaNaglieri@kingedwardvii.co.uk"],
  ["Mercy Ng'ang'a", "MercyNg'ang'a@kingedwardvii.co.uk"],
  ["Irmina Dyer", "IrminaDyer@kingedwardvii.co.uk"],
  ["Nickshia Henry", "NickshiaHenry@kingedwardvii.co.uk"],
  ["Vervelin Brown", "vbrown@kingedwardvii.co.uk"],
  ["Jane Bolic", "JaneBolic@kingedwardvii.co.uk"],
  ["Andreea Caraet", "ACaraet@kingedwardvii.co.uk"],
  ["Saira Rasheed", "SairaRasheed@kingedwardvii.co.uk"],
  ["Muhammad Usman", "musman@kingedwardviicouk.onmicrosoft.com"],
  ["Antonio Constantini", "aconstantini@kingedwardvii.co.uk"],
  ["Charity Gichia", "Cwashuka@kingedwardvii.co.uk"],
  ["Stella Ameto", "Sameto@kingedwardvii.co.uk"],
  ["Velisiwe Nellie Ndaba", "vndaba@kingedwardvii.co.uk"],
  ["Oana Balint", "OanaBalint@kingedwardvii.co.uk"],
  ["Mariel Bulahan", "MarielBulahan@kingedwardvii.co.uk"],
  ["Agnieszka Nowak", "AgnieszkaNowak@kingedwardvii.co.uk"],
  ["Christine Takundwa", "ChristineTakundwa@kingedwardvii.co.uk"],
  ["Petronella Phiri", "PetronellaPhiri@kingedwardvii.co.uk"],
  ["Patricia Oliva Guerra", "PatriciaOlivaGuerra@kingedwardvii.co.uk"],
  ["Nyaradzo Chiswo", "NyaradzoChiswo@kingedwardvii.co.uk"],
  ["Jennifer Sibal", "JenniferSibal@kingedwardvii.co.uk"],
  ["Marcelina Montalvo", "MarcelinaMontalvo@kingedwardvii.co.uk"],
  ["Juliana Mwakitawa", "JulianaMwakitawa@kingedwardvii.co.uk"],
  ["Melody Cruz", "MelodyCruz@kingedwardvii.co.uk"],
  ["Ersire Remollo", "ErsireRemollo@kingedwardvii.co.uk"],
  ["Anka Rakas", "AnkaRakas@kingedwardvii.co.uk"],
  ["Regina Baah", "ReginaBaah@kingedwardvii.co.uk"],
  ["Andrea Testi", "AndreaTesti@kingedwardvii.co.uk"],
  ["Mihaela Mihalceanu", "MihaelaMihalceanu@kingedwardvii.co.uk"],
  ["Emily Caliao", "EmilyCaliao@kingedwardvii.co.uk"],
  ["Tania Jones", "TaniaJones@kingedwardvii.co.uk"],
  ["Vincenzo Mattia", "VincenzoMattia@kingedwardvii.co.uk"],
  ["Donalyn Galino", "DonalynGalino@kingedwardvii.co.uk"],
  ["Margaret Gaspar", "MargaretGaspar@kingedwardvii.co.uk"],
  ["Isabelle Masson", "IsabelleMasson@kingedwardvii.co.uk"],
  ["Maria O Haodha", "MariaOHaodha@kingedwardvii.co.uk"],
  ["Farhiya Suleiman Ali", "FarhiyaSuleimanAli@kingedwardvii.co.uk"],
  ["Nicola Sardu", "NicolaSardu@kingedwardvii.co.uk"],
  ["Helen Cordwell", "HelenCordwell@kingedwardvii.co.uk"],
  ["Christiana Akpan", "ChristianaAkpan@kingedwardvii.co.uk"],
  ["Lucrezia Naglieri", "LucreziaNaglieri@kingedwardvii.co.uk"],
  ["Sarah Mant", "SarahMant@kingedwardvii.co.uk"],
  ["Catherine Herbert", "CatherineHerbert@kingedwardvii.co.uk"],
  ["Vanessa Catulin", "VanessaCatulin@kingedwardvii.co.uk"],
  ["Amal Hussein", "AmalHussein@kingedwardvii.co.uk"],
  ["Mervin Albania", "MervinAlbania@kingedwardvii.co.uk"],
  ["Mercy Ng'ang'a", "MercyNg'ang'a@kingedwardvii.co.uk"],
  ["Mariyana Savcheva", "MariyanaSavcheva@kingedwardvii.co.uk"],
  ["Irmina Dyer", "IrminaDyer@kingedwardvii.co.uk"],
  ["Mary Grace Alejandria", "MaryGraceAlejandria@kingedwardvii.co.uk"],
  ["Jane Bolic", "JaneBolic@kingedwardvii.co.uk"],
  ["Enzo Diokno", "EnzoDiokno@kingedwardvii.co.uk"],
  ["Muhammad Usman", "musman@kingedwardviicouk.onmicrosoft.com"],
  ["Mariel Bulahan", "MarielBulahan@kingedwardvii.co.uk"],
  ["Christine Takundwa", "ChristineTakundwa@kingedwardvii.co.uk"],
  ["Petronella Phiri", "PetronellaPhiri@kingedwardvii.co.uk"],
  ["Jennifer Sibal", "JenniferSibal@kingedwardvii.co.uk"],
  ["Tania Jones", "TaniaJones@kingedwardvii.co.uk"],
  ["Maria O Haodha", "MariaOHaodha@kingedwardvii.co.uk"],
  ["Enzo Diokno", "EnzoDiokno@kingedwardvii.co.uk"],
  ["Oana Balint", "OanaBalint@kingedwardvii.co.uk"],
  ["Jennifer Sibal", "JenniferSibal@kingedwardvii.co.uk"],
  ["Marcelina Montalvo", "MarcelinaMontalvo@kingedwardvii.co.uk"],
  ["Juliana Mwakitawa", "JulianaMwakitawa@kingedwardvii.co.uk"],
  ["Ersire Remollo", "ErsireRemollo@kingedwardvii.co.uk"],
  ["Mihaela Mihalceanu", "MihaelaMihalceanu@kingedwardvii.co.uk"],
  ["Emily Caliao", "EmilyCaliao@kingedwardvii.co.uk"],
  ["Tania Jones", "TaniaJones@kingedwardvii.co.uk"],
  ["Vincenzo Mattia", "VincenzoMattia@kingedwardvii.co.uk"],
  ["Donalyn Galino", "DonalynGalino@kingedwardvii.co.uk"],
  ["Charlotte Kent", "CharlotteKent@kingedwardvii.co.uk"],
  ["Lara Fenude", "LaraFenude@kingedwardvii.co.uk"],
  ["Mariyana Savcheva", "MariyanaSavcheva@kingedwardvii.co.uk"],
  ["Oundrey Tolato", "OundreyTolato@kingedwardvii.co.uk"],
  ["Tony Gurbuxani", "tgurbuxani@kingedwardvii.co.uk"]
];

const normalize = (name) => name.toLowerCase().replace(/\s+/g, ' ').trim();

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Security check - only admins or managers
        if (!user || (user.role !== 'admin' && user.access_level !== 'manager')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all employees
        const employees = await base44.asServiceRole.entities.Employee.list(undefined, 2000);
        const empMap = new Map();
        
        employees.forEach(e => {
            if (e.full_name) {
                empMap.set(normalize(e.full_name), e);
            }
        });

        const updates = [];
        const logs = [];
        const notFound = [];

        for (const [rawName, email] of mapping) {
            const name = normalize(rawName);
            const emp = empMap.get(name);

            if (emp) {
                if (emp.user_email !== email) {
                    updates.push(
                        base44.asServiceRole.entities.Employee.update(emp.id, { user_email: email })
                            .then(() => ({ status: 'updated', name: rawName, from: emp.user_email, to: email }))
                            .catch(err => ({ status: 'failed', name: rawName, error: err.message }))
                    );
                } else {
                    logs.push({ status: 'skipped', name: rawName, reason: 'Email already matches' });
                }
            } else {
                notFound.push(rawName);
            }
        }

        const results = await Promise.all(updates);
        
        return Response.json({
            success: true,
            updated: results.filter(r => r.status === 'updated').length,
            failed: results.filter(r => r.status === 'failed').length,
            notFound: notFound.length,
            notFoundNames: notFound,
            details: results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});