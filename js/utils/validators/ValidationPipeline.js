/**
 * Orchestrates validation across multiple validators
 */
class ValidationPipeline {
    constructor() {
        this.validators = [
            new QueueNameValidator(),
            new CapacitySumValidator(),
            new QueueStateValidator(),
            new NodeLabelValidator()
        ];
    }

    validate(configModel, formattedHierarchy, schedulerInfoModel, appStateModel) {
        const allErrors = [];
        
        for (const validator of this.validators) {
            try {
                const errors = validator.validate(configModel, formattedHierarchy, schedulerInfoModel, appStateModel);
                allErrors.push(...errors);
            } catch (error) {
                console.error(`Validation error in ${validator.constructor.name}:`, error);
                allErrors.push({
                    type: 'VALIDATION_SYSTEM_ERROR',
                    message: `Internal validation error: ${error.message}`,
                    queuePath: null
                });
            }
        }

        return allErrors;
    }
}