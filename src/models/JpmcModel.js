const { Schema, default: mongoose } = require("mongoose");

const utilityService = require("../services/UtilityService");

const idValue = "jpmc";

const JpmcSchema = new Schema({
    fetchDate: String,
    company: String,
    jobId: String,
    jobHash: String,
    title: String,
    postedDate: String,
    shortDescription: String,
    primaryLocation: String,
    primaryLocationCountry: String,
    hotJobFlag: Boolean,
    trendingFlag: Boolean,
    beFirstToApplyFlag: Boolean,
    expiredFlag: Boolean,
    relevancy: Number,
    workplaceTypeCode: String,
    workplaceType: String,
    secondaryLocations: [
        {
            name: String,
            countryCode: String,
        },
    ],
});

const jobs = mongoose.model("JpmcJobs", JpmcSchema, "jobs");

function createJobsArray(jobsArray) {
    const fetchDate = utilityService.getTimestamp(new Date(Date.now()))

    const jobItems = jobsArray.map((item) => {
        const secondaryLocations =
        item.secondaryLocations.length > 0
            ? item.secondaryLocations.map((location) => {
                const modifiedLocation = {
                name: location.Name,
                countryCode: location.CountryCode,
                };

                return modifiedLocation;
            })
            : [];

        let modifiedItem = {
            company: idValue,
            jobId: item.Id,
            title: item.Title,
            postedDate: item.PostedDate,
            primaryLocationCountry: item.PrimaryLocationCountry,
            workplaceTypeCode: item.WorkplaceTypeCode,
            workplaceType: item.WorkplaceType,
        };

        modifiedItem.jobHash = 
            Buffer
                .from(
                    Object
                        .values(modifiedItem)
                        .map((val) => {
                            return (val + "").toLowerCase();
                        })
                        .join(""))
                .toString("base64");

        modifiedItem = {
            ...modifiedItem,
            shortDescription: item.ShortDescriptionStr,
            primaryLocation: item.PrimaryLocation,
            beFirstToApplyFlag: item.BeFirstToApplyFlag,
            hotJobFlag: item.HotJobFlag,
            trendingFlag: item.TrendingFlag,
            relevancy: item.Relevancy,
            secondaryLocations: secondaryLocations,
            expiredFlag: false,
            fetchDate: fetchDate
        }

        return modifiedItem;
    });

    return jobItems;
}

module.exports = {
  jobs,
  id: idValue,
  createJobsArray,
};
