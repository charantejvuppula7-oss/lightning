from api.models import Milestone_Features


def create_features(milestones):
    """
    Bulk-instantiate and persist features under their parent milestones.

    Extracts child task specifications and associates each task specification with its
    feature instance for downstream task provisioning.

    Args:
        milestones (list[tuple[Milestones, dict]]): Pairs of created Milestones and source data.

    Returns:
        list[tuple[dict, Milestone_Features]]: Pairs of (task_data_dict, feature_instance).
    """
    features = []
    task_specs = []
    for milestone, milestone_data in milestones:
        for feature_data in milestone_data['features']:
            feature = Milestone_Features(
                Milestone=milestone,
                **{key: value for key, value in feature_data.items() if key != 'tasks'},
            )
            features.append(feature)
            task_specs.extend((data, feature) for data in feature_data.get('tasks', []))
    Milestone_Features.objects.bulk_create(features, batch_size=200)
    return task_specs

