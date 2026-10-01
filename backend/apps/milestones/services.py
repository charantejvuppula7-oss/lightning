from api.models import Milestones


def create_milestones(project, user, milestones_data):
    prepared = [
        (Milestones(project=project, created_by=user, updated_by=user,
                    **{key: value for key, value in data.items() if key != 'features'}), data)
        for data in milestones_data
    ]
    Milestones.objects.bulk_create([milestone for milestone, _ in prepared], batch_size=200)
    return prepared
